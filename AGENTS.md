# AGENTS.md

## Structure
- `api/Program.cs` — entire backend: .NET 8 minimal API, thin proxy to Ollama. No controllers, no layers; add endpoints there.
- `api/OllamaApiProxy.csproj` — `net8.0`, `Nullable enable`, `ImplicitUsings enable`. Single dependency-free project.
- `ollama/` — `Dockerfile` (debian + `install.sh`) + `entrypoint.sh` (serves, then `ollama pull`). Active model is `digitsflow/bonsai-8b:latest`; the two commented `ollama pull` lines are stale alternatives.
- `chat-frontend/` — dependency-free static UI (`index.html`, `app.js`, `styles.css`). No npm, no build, no dev server. Open `index.html` directly.
- `docker-compose.yml` — only wires `api` + `ollama-app`. Frontend is intentionally not composed.

## Run
- Full stack: `docker compose up --build` — API hot-reloads via `dotnet watch` (source bind-mounted; `obj/`/`bin/` excluded via anonymous volumes, see compose).
- Ports: host `5000` → API `:8080`; host `8000` → Ollama `:11434`.
- Local API without compose: `dotnet run --project api/OllamaApiProxy.csproj` with `OLLAMA_URL=http://localhost:8000` (default fallback is the compose DNS name `http://ollama-app:11434`, which fails outside Docker).
- No tests, lint, CI, or formatting config exist. Verify with `dotnet build api/` and manual `curl localhost:5000/health`.

## API conventions
- Proxy endpoints: `GET /api/tags`, `POST /api/generate`, `POST /api/chat`. POST bodies are forwarded verbatim as `application/json`; do not reshape payloads so new Ollama options keep working.
- POST rejects empty body (400) and non-JSON `Content-Type` (400). Upstream errors map to `503` unreachable / `504` timeout / `502` bad status; success streams raw bytes (JSON or NDJSON) via `Results.Stream`.
- `Results.Stream` on net8.0 has no `statusCode` parameter — success path is always 200; use `Results.Content(payload, mediaType, statusCode:)` only for error passthrough (already handled in `ForwardOllamaResponseAsync`).
- `OLLAMA_URL` is trimmed of trailing `/` and must be absolute http(s); invalid values throw at startup in `ResolveOllamaBaseUrl`.
- `HttpClient "ollama"` timeout is 5 min for generation; keep it.

## Frontend state (gotchas)
- Backend wiring is explicitly out of scope: `app.js` echoes locally (`appendLocalPreviewReply`), model `<select>` is `disabled`, status lamp is hardcoded "not connected". Wiring it to `http://localhost:5000/api/*` is the expected next step (see `TODO/backend` in `app.js`).
- Title/options still say `qwen2.5:1.5b` / `gemma2:2b` but the container pulls `digitsflow/bonsai-8b:latest` — treat the entrypoint as truth.
- XSS rule: keep using `textContent`, never `innerHTML`, when rendering messages.
