using GeoFold.Api.Data;
using GeoFold.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Quota;

/// <summary>
/// Single place that resolves a user's effective quota and checks it before a resource is created.
/// Controllers call this instead of scattering quota logic across endpoints.
/// </summary>
public interface IQuotaService
{
    Task<QuotaLimits> GetLimitsAsync(Guid userId, CancellationToken ct = default);
    Task<QuotaCheckResult> CheckProjectCreationAsync(Guid userId, CancellationToken ct = default);
    Task<QuotaCheckResult> CheckSurveyCreationAsync(Guid userId, CancellationToken ct = default);
    Task<QuotaCheckResult> CheckPhotoUploadAsync(Guid userId, long newBytes, CancellationToken ct = default);
}

public class QuotaService : IQuotaService
{
    private readonly AppDbContext _db;

    public QuotaService(AppDbContext db) => _db = db;

    public async Task<QuotaLimits> GetLimitsAsync(Guid userId, CancellationToken ct = default)
    {
        var sub = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        // An inactive/past-due subscription drops the user back to free-tier limits.
        var effectivePlan = sub is { IsActive: true } ? sub.Plan : SubscriptionPlan.Free;
        var baseLimits = PlanQuotas.For(effectivePlan);

        if (sub is null)
            return baseLimits;

        // Per-user overrides on the subscription row take precedence over the plan default.
        return new QuotaLimits(
            sub.MaxProjects ?? baseLimits.MaxProjects,
            sub.MaxSurveysPerMonth ?? baseLimits.MaxSurveysPerMonth,
            sub.StorageQuotaMb ?? baseLimits.StorageQuotaMb);
    }

    public async Task<QuotaCheckResult> CheckProjectCreationAsync(Guid userId, CancellationToken ct = default)
    {
        var limits = await GetLimitsAsync(userId, ct);
        if (limits.MaxProjects is not { } max)
            return QuotaCheckResult.Ok;

        var count = await _db.Projects
            .CountAsync(p => p.UserId == userId && p.ArchivedAtUtc == null, ct);

        return count >= max
            ? QuotaCheckResult.Deny($"Project limit reached ({count}/{max}). Upgrade your plan to create more.")
            : QuotaCheckResult.Ok;
    }

    public async Task<QuotaCheckResult> CheckSurveyCreationAsync(Guid userId, CancellationToken ct = default)
    {
        var limits = await GetLimitsAsync(userId, ct);
        if (limits.MaxSurveysPerMonth is not { } max)
            return QuotaCheckResult.Ok;

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var count = await _db.Surveys
            .CountAsync(s => s.UserId == userId && s.SyncedAtUtc >= monthStart, ct);

        return count >= max
            ? QuotaCheckResult.Deny($"Monthly survey limit reached ({count}/{max}). Upgrade your plan to sync more this month.")
            : QuotaCheckResult.Ok;
    }

    public async Task<QuotaCheckResult> CheckPhotoUploadAsync(Guid userId, long newBytes, CancellationToken ct = default)
    {
        var limits = await GetLimitsAsync(userId, ct);
        if (limits.StorageQuotaMb is not { } quotaMb)
            return QuotaCheckResult.Ok;

        var quotaBytes = (long)quotaMb * 1024 * 1024;

        var usedBytes = await _db.SurveyPhotos
            .Where(p => p.Survey.UserId == userId)
            .SumAsync(p => (long?)p.SizeBytes, ct) ?? 0L;

        return usedBytes + newBytes > quotaBytes
            ? QuotaCheckResult.Deny($"Storage quota exceeded ({FormatMb(usedBytes)}/{quotaMb} MB used). Upgrade your plan for more storage.")
            : QuotaCheckResult.Ok;
    }

    private static string FormatMb(long bytes) => (bytes / (1024.0 * 1024.0)).ToString("0.#");
}
