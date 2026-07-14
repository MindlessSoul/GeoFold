using GeoFold.Api.Data;
using GeoFold.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GeoFold.Api.Services;

public class SubscriptionCache : ISubscriptionCache
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public SubscriptionCache(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default)
    {
        var key = CacheKey(userId);
        if (_cache.TryGetValue(key, out bool cached))
            return cached;

        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        var isActive = subscription?.IsActive ?? false;
        _cache.Set(key, isActive, CacheTtl);
        return isActive;
    }

    public void Invalidate(Guid userId) => _cache.Remove(CacheKey(userId));

    private static string CacheKey(Guid userId) => $"sub-active:{userId}";
}
