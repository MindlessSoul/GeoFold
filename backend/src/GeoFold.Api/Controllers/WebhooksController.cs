using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Controllers;

[ApiController]
[Route("api/v1/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionCache _subscriptionCache;
    private readonly IConfiguration _configuration;

    public WebhooksController(AppDbContext db, ISubscriptionCache subscriptionCache, IConfiguration configuration)
    {
        _db = db;
        _subscriptionCache = subscriptionCache;
        _configuration = configuration;
    }

    // Placeholder shared-secret check. Swap for real provider signature verification
    // (Stripe-Signature HMAC, RevenueCat Authorization header, App Store JWS) per provider.
    [HttpPost("{provider}")]
    public async Task<IActionResult> Handle(
        string provider, [FromHeader(Name = "X-Webhook-Secret")] string? secret,
        SubscriptionWebhookPayload payload, CancellationToken ct)
    {
        if (secret != _configuration["Webhooks:SharedSecret"])
            return Unauthorized();

        var subscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == payload.UserId, ct);
        if (subscription is null)
        {
            subscription = new Subscription { Id = Guid.NewGuid(), UserId = payload.UserId };
            _db.Subscriptions.Add(subscription);
        }

        subscription.Plan = payload.Plan;
        subscription.Status = payload.Status;
        subscription.Provider = payload.Provider;
        subscription.ProviderRef = payload.ProviderRef;
        subscription.CurrentPeriodEndUtc = payload.CurrentPeriodEndUtc;
        subscription.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        _subscriptionCache.Invalidate(payload.UserId);

        return NoContent();
    }
}
