namespace GeoFold.Api.Services;

public interface IStorageService
{
    Task<string> CreateUploadUrlAsync(string objectPath, CancellationToken ct = default);

    Task<string> CreateDownloadUrlAsync(string objectPath, TimeSpan expiry, CancellationToken ct = default);

    Task<bool> ExistsAsync(string objectPath, CancellationToken ct = default);

    /// <summary>
    /// Actual stored size in bytes, or null when storage doesn't report it. Used to verify the
    /// size a client declared at initiate, which must never be trusted for quota accounting.
    /// </summary>
    Task<long?> GetSizeAsync(string objectPath, CancellationToken ct = default);
}
