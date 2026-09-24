WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

string ollamaBaseUrl = ResolveOllamaBaseUrl(builder.Configuration);

builder.Services.AddHttpClient("ollama", client =>
{
	client.BaseAddress = new Uri(ollamaBaseUrl, UriKind.Absolute);
	client.Timeout = TimeSpan.FromMinutes(5);
});

WebApplication app = builder.Build();

app.MapGet("/", () =>
{
	return "Hello, World!";
});

app.MapGet("/time", () =>
{
	return new { time = DateTime.Now };
});

app.MapGet("/health", async (IHttpClientFactory httpClientFactory) =>
{
	HttpClient client = httpClientFactory.CreateClient("ollama");

	HttpResponseMessage response;
	try
	{
		response = await client.GetAsync("api/tags");
	}
	catch (HttpRequestException exception)
	{
		return Results.Problem($"Ollama server is unreachable: {exception.Message}", statusCode: 503);
	}
	catch (TaskCanceledException)
	{
		return Results.Problem("Ollama server timed out.", statusCode: 504);
	}

	if (response.IsSuccessStatusCode == false)
	{
		return Results.Problem($"Ollama server returned {(int)response.StatusCode}.", statusCode: 502);
	}

	return Results.Ok(new { status = "ok", ollama = ollamaBaseUrl });
});

app.MapGet("/api/tags", async (IHttpClientFactory httpClientFactory) =>
{
	HttpClient client = httpClientFactory.CreateClient("ollama");
	return await ProxyOllamaGetAsync(client, "api/tags");
});

app.MapPost("/api/generate", async (HttpRequest request, IHttpClientFactory httpClientFactory) =>
{
	HttpClient client = httpClientFactory.CreateClient("ollama");
	return await ProxyOllamaPostAsync(client, "api/generate", request);
});

app.MapPost("/api/chat", async (HttpRequest request, IHttpClientFactory httpClientFactory) =>
{
	HttpClient client = httpClientFactory.CreateClient("ollama");
	return await ProxyOllamaPostAsync(client, "api/chat", request);
});

app.Run();

static string ResolveOllamaBaseUrl(ConfigurationManager configuration)
{
	string? configuredUrl = configuration["OLLAMA_URL"];

	if (string.IsNullOrWhiteSpace(configuredUrl))
	{
		// Why: compose sets OLLAMA_URL, local runs do not, so default to the compose DNS name.
		configuredUrl = "http://ollama-app:11434";
	}

	configuredUrl = configuredUrl.Trim().TrimEnd('/');

	bool isValid = Uri.TryCreate(configuredUrl, UriKind.Absolute, out Uri? parsedUri);
	if (isValid == false || parsedUri == null)
	{
		throw new InvalidOperationException($"Invalid OLLAMA_URL: '{configuredUrl}'.");
	}

	if (parsedUri.Scheme != Uri.UriSchemeHttp && parsedUri.Scheme != Uri.UriSchemeHttps)
	{
		throw new InvalidOperationException($"OLLAMA_URL must use http or https: '{configuredUrl}'.");
	}

	return parsedUri.ToString().TrimEnd('/');
}

static async Task<IResult> ProxyOllamaGetAsync(HttpClient client, string path)
{
	HttpResponseMessage response;
	try
	{
		response = await client.GetAsync(path, HttpCompletionOption.ResponseHeadersRead);
	}
	catch (HttpRequestException exception)
	{
		return Results.Problem($"Ollama server is unreachable: {exception.Message}", statusCode: 503);
	}
	catch (TaskCanceledException)
	{
		return Results.Problem("Ollama server timed out.", statusCode: 504);
	}

	return await ForwardOllamaResponseAsync(response);
}

static async Task<IResult> ProxyOllamaPostAsync(HttpClient client, string path, HttpRequest request)
{
	if (request.ContentLength == 0)
	{
		return Results.BadRequest(new { error = "Request body is required." });
	}

	if (IsJsonRequest(request) == false)
	{
		return Results.BadRequest(new { error = "Content-Type must be application/json." });
	}

	using HttpRequestMessage outgoingRequest = new HttpRequestMessage(HttpMethod.Post, path);

	// Why: forward the caller payload verbatim so new Ollama options keep working without code changes.
	outgoingRequest.Content = new StreamContent(request.Body);
	outgoingRequest.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

	HttpResponseMessage response;
	try
	{
		response = await client.SendAsync(outgoingRequest, HttpCompletionOption.ResponseHeadersRead);
	}
	catch (HttpRequestException exception)
	{
		return Results.Problem($"Ollama server is unreachable: {exception.Message}", statusCode: 503);
	}
	catch (TaskCanceledException)
	{
		return Results.Problem("Ollama server timed out.", statusCode: 504);
	}

	return await ForwardOllamaResponseAsync(response);
}

static bool IsJsonRequest(HttpRequest request)
{
	if (request.ContentType == null)
	{
		return false;
	}

	return request.ContentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase);
}

static async Task<IResult> ForwardOllamaResponseAsync(HttpResponseMessage response)
{
	string mediaType = response.Content.Headers.ContentType?.MediaType ?? "application/json";

	if (response.IsSuccessStatusCode)
	{
		Stream responseStream = await response.Content.ReadAsStreamAsync();

		// Why: stream the Ollama payload back untouched to preserve both JSON and NDJSON streaming modes.
		// Note: Results.Stream on net8.0 has no statusCode parameter, success is always 200 here.
		return Results.Stream(responseStream, mediaType);
	}

	string errorPayload = await response.Content.ReadAsStringAsync();

	// Why: Results.Content supports an explicit status code on net8.0, so Ollama errors keep their status.
	return Results.Content(errorPayload, mediaType, statusCode: (int)response.StatusCode);
}
