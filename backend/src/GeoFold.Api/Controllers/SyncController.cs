using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Controllers;

/// <summary>
/// Offline sync. Wraps the same upsert rules the online endpoint uses, so a device that was out of
/// signal can drain its queue in one request and catch up on changes made elsewhere.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/sync")]
public class SyncController : ControllerBase
{
    // Bounded so a device that has been offline for weeks drains in pages instead of one huge request.
    private const int MaxPushBatch = 200;

    private readonly AppDbContext _db;
    private readonly ISurveySyncService _sync;

    public SyncController(AppDbContext db, ISurveySyncService sync)
    {
        _db = db;
        _sync = sync;
    }

    /// <summary>
    /// Drains a device's outbox. Items are applied independently and each reports its own outcome:
    /// a survey rejected by the form schema, or one that trips the monthly quota, must not stop the
    /// rest of the batch from landing. Safe to retry — upsert is keyed on the client-generated Id.
    /// </summary>
    [HttpPost("surveys")]
    public async Task<ActionResult<SyncPushResponse>> PushSurveys(SyncPushRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        if (request.Surveys.Count == 0)
            return Ok(new SyncPushResponse(0, 0, []));

        if (request.Surveys.Count > MaxPushBatch)
            return BadRequest(new
            {
                error = "batch_too_large",
                message = $"A push may contain at most {MaxPushBatch} surveys; got {request.Surveys.Count}."
            });

        var results = new List<SyncItemResult>(request.Surveys.Count);
        foreach (var survey in request.Surveys)
        {
            var result = await _sync.UpsertAsync(userId, survey, ct);
            results.Add(new SyncItemResult(result.Id, result.Status, result.Errors));
        }

        var accepted = results.Count(r => r.Status is SyncOutcome.Created or SyncOutcome.Updated);
        return Ok(new SyncPushResponse(accepted, results.Count - accepted, results));
    }

    /// <summary>
    /// Changes since the client's last cursor, so a reinstalled or second device can catch up.
    /// Ordered by server sync time — a client cannot advance the cursor by backdating its own
    /// timestamps. Pass the returned Cursor as `since` on the next call while HasMore is true.
    /// </summary>
    [HttpGet("surveys")]
    public async Task<ActionResult<SyncPullResponse>> PullSurveys(
        [FromQuery] DateTime? since,
        [FromQuery] int limit = 500,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        limit = Math.Clamp(limit, 1, 1000);

        var query = _db.Surveys.AsNoTracking().Where(s => s.UserId == userId);

        if (since is not null)
        {
            var sinceUtc = since.Value.ToUniversalTime();
            query = query.Where(s => s.SyncedAtUtc > sinceUtc);
        }

        var surveys = await query
            .OrderBy(s => s.SyncedAtUtc)
            .Take(limit)
            .Include(s => s.Photos)
            .ToListAsync(ct);

        // Each write stamps its own SyncedAtUtc, so a strict '>' cursor cannot skip rows in practice.
        var cursor = surveys.Count > 0 ? surveys[^1].SyncedAtUtc : since;

        return Ok(new SyncPullResponse(
            surveys.Select(SurveyMapper.ToResponse).ToList(),
            cursor,
            surveys.Count == limit));
    }
}
