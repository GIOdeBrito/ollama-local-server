# Development image using only the .NET SDK with hot reload
FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV DOTNET_WATCH_RESTART_ON_RUDE_EDIT=true

# Restore dependencies to warm the NuGet cache; source code is provided at runtime via compose volume
COPY ["OllamaApiProxy.csproj", "./"]
RUN dotnet restore "OllamaApiProxy.csproj"

ENTRYPOINT ["dotnet", "watch", "run", "--project", "OllamaApiProxy.csproj", "--no-launch-profile"]
