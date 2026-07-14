using System.Security.Claims;
using GeoFold.Api.Services;
using Microsoft.AspNetCore.Authorization;

namespace GeoFold.Api.Authorization;

public class ActiveSubscriptionHandler : AuthorizationHandler<ActiveSubscriptionRequirement>
{
    private readonly ISubscriptionCache _subscriptionCache;

    public ActiveSubscriptionHandler(ISubscriptionCache subscriptionCache)
    {
        _subscriptionCache = subscriptionCache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ActiveSubscriptionRequirement requirement)
    {
        var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? context.User.FindFirstValue("sub");

        if (Guid.TryParse(sub, out var userId) && await _subscriptionCache.IsActiveAsync(userId))
        {
            context.Succeed(requirement);
        }
    }
}
