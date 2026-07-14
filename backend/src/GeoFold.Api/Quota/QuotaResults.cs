using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GeoFold.Api.Quota;

public static class QuotaResults
{
    /// <summary>
    /// 403 with a machine-readable <c>quota_exceeded</c> code so clients can distinguish a plan-limit
    /// rejection from an ordinary authorization failure and prompt an upgrade.
    /// </summary>
    public static ObjectResult QuotaExceeded(string? message) =>
        new(new { error = "quota_exceeded", message })
        {
            StatusCode = StatusCodes.Status403Forbidden
        };
}
