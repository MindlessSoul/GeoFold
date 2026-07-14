namespace GeoFold.Api.Services;

public interface IStorageService
{
    Task<string> CreateUploadUrlAsync(string objectPath, CancellationToken ct = default);

    Task<string> CreateDownloadUrlAsync(string objectPath, TimeSpan expiry, CancellationToken ct = default);

    Task<bool> ExistsAsync(string objectPath, CancellationToken ct = default);
}
