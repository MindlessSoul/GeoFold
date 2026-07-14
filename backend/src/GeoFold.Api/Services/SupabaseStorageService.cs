using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace GeoFold.Api.Services;

public class SupabaseStorageService : IStorageService
{
    private readonly HttpClient _http;
    private readonly SupabaseOptions _options;

    public SupabaseStorageService(HttpClient http, IOptions<SupabaseOptions> options)
    {
        _options = options.Value;
        http.BaseAddress = new Uri(_options.Url);
        http.DefaultRequestHeaders.Add("apikey", _options.ServiceRoleKey);
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        _http = http;
    }

    public async Task<string> CreateUploadUrlAsync(string objectPath, CancellationToken ct = default)
    {
        var response = await _http.PostAsync(
            $"/storage/v1/object/upload/sign/{_options.StorageBucket}/{objectPath}", null, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<SignedUploadUrlResponse>(cancellationToken: ct);
        return $"{_options.Url}/storage/v1{body!.Url}";
    }

    public async Task<string> CreateDownloadUrlAsync(string objectPath, TimeSpan expiry, CancellationToken ct = default)
    {
        var response = await _http.PostAsJsonAsync(
            $"/storage/v1/object/sign/{_options.StorageBucket}/{objectPath}",
            new { expiresIn = (int)expiry.TotalSeconds }, ct);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<SignedDownloadUrlResponse>(cancellationToken: ct);
        return $"{_options.Url}/storage/v1{body!.SignedURL}";
    }

    public async Task<bool> ExistsAsync(string objectPath, CancellationToken ct = default)
    {
        var response = await _http.GetAsync(
            $"/storage/v1/object/info/{_options.StorageBucket}/{objectPath}", ct);
        return response.IsSuccessStatusCode;
    }

    private record SignedUploadUrlResponse(string Url);
    private record SignedDownloadUrlResponse(string SignedURL);
}
