# Development image using only the .NET SDK with hot reload
FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV DOTNET_WATCH_RESTART_ON_RUDE_EDIT=true

# Copy only the project file first to leverage Docker layer caching on restore
COPY ["*.csproj", "./"]
RUN dotnet restore "./*.csproj"

# Copy the remaining source code for live reload
COPY . .

ENTRYPOINT ["dotnet", "watch", "run", "--no-launch-profile"]
