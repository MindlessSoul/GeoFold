using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
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

    public SubscriptionsController(AppDbContext db) => _db = db;

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = User.GetUserId();
        var subscription = await _db.Subscriptions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        return Ok(new
        {
            plan = subscription?.Plan ?? Models.SubscriptionPlan.Free,
            status = subscription?.Status ?? Models.SubscriptionStatus.Canceled,
            isActive = subscription?.IsActive ?? false,
            currentPeriodEndUtc = subscription?.CurrentPeriodEndUtc
        });
    }
}
