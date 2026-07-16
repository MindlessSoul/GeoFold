using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Quota;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IQuotaService _quota;

    public SubscriptionsController(AppDbContext db, IQuotaService quota)
    {
        _db = db;
        _quota = quota;
    }

    /// <summary>
    /// The caller's plan plus the effective quota ceiling and what they've consumed, so a client
    /// can show usage and warn before a write is rejected with 403 quota_exceeded.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<SubscriptionMeResponse>> Me(CancellationToken ct)
    {
        var userId = User.GetUserId();

        var subscription = await _db.Subscriptions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        var limits = await _quota.GetLimitsAsync(userId, ct);
        var usage = await _quota.GetUsageAsync(userId, ct);

        return Ok(new SubscriptionMeResponse(
            subscription?.Plan ?? SubscriptionPlan.Free,
            subscription?.Status ?? SubscriptionStatus.Canceled,
            subscription?.IsActive ?? false,
            subscription?.CurrentPeriodEndUtc,
            new QuotaLimitsResponse(limits.MaxProjects, limits.MaxSurveysPerMonth, limits.StorageQuotaMb),
            new QuotaUsageResponse(
                usage.Projects,
                usage.SurveysThisMonth,
                Math.Round(usage.StorageBytes / (1024.0 * 1024.0), 2))));
    }
}
