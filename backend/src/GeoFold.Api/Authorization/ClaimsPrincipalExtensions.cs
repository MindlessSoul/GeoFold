using System.Security.Claims;

namespace GeoFold.Api.Authorization;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new InvalidOperationException("Authenticated request is missing a valid user id claim.");
    }
}
