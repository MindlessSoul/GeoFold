using System.Security.Cryptography;
using System.Text;
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
        var configured = _configuration["Webhooks:SharedSecret"];

        // Fail closed. Previously an unset secret ("" in appsettings) compared equal to an empty
        // header, so anyone could POST here and grant themselves a premium subscription.
        if (string.IsNullOrWhiteSpace(configured))
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "webhook_not_configured" });

        if (!MatchesSecret(secret, configured))
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

    /// <summary>Constant-time comparison so the secret can't be recovered by timing the response.</summary>
    private static bool MatchesSecret(string? provided, string configured)
    {
        if (string.IsNullOrEmpty(provided)) return false;

        var a = Encoding.UTF8.GetBytes(provided);
        var b = Encoding.UTF8.GetBytes(configured);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
}
