# Multi-stage build for the GeoFold .NET API. Build context is the repo root.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (cached unless the csproj changes), then copy the rest and publish.
COPY backend/src/GeoFold.Api/GeoFold.Api.csproj backend/src/GeoFold.Api/
RUN dotnet restore backend/src/GeoFold.Api/GeoFold.Api.csproj
COPY backend/ backend/
RUN dotnet publish backend/src/GeoFold.Api/GeoFold.Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# The aspnet:8.0 image already listens on 8080 and runs as a non-root user, which matches
# Cloud Run's default port. Real config (Supabase keys, connection string) is injected as
# environment variables at deploy time — never baked into the image.
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "GeoFold.Api.dll"]
