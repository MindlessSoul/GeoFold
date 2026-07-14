namespace GeoFold.Api.Services;

public interface ISubscriptionCache
{
    Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default);
    void Invalidate(Guid userId);
}
