using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Quota;
using GeoFold.Api.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace GeoFold.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/surveys")]
public class SurveysController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GeometryFactory _geometryFactory;
    private readonly ISurveySyncService _sync;

    public SurveysController(AppDbContext db, GeometryFactory geometryFactory, ISurveySyncService sync)
    {
        _db = db;
        _geometryFactory = geometryFactory;
        _sync = sync;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SurveyResponse>>> List(
        [FromQuery] Guid? projectId,
        [FromQuery] double? minLat, [FromQuery] double? minLng,
        [FromQuery] double? maxLat, [FromQuery] double? maxLng,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 100,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = _db.Surveys.AsNoTracking().Where(s => s.UserId == userId);

        if (projectId is not null)
            query = query.Where(s => s.ProjectId == projectId);

        if (minLat is not null && minLng is not null && maxLat is not null && maxLng is not null)
        {
            var bbox = _geometryFactory.ToGeometry(
                new NetTopologySuite.Geometries.Envelope(minLng.Value, maxLng.Value, minLat.Value, maxLat.Value));
            query = query.Where(s => s.Location.Intersects(bbox));
        }

        var surveys = await query
            .OrderByDescending(s => s.CapturedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(s => s.Photos)
            .ToListAsync(ct);

        return Ok(surveys.Select(SurveyMapper.ToResponse));
    }

    // Map/report feed for the SPA: a GeoJSON FeatureCollection of the caller's surveys,
    // filterable by project and viewport bbox. Lightweight per marker (photoCount only);
    // the SPA fetches full detail + photo URLs via GET {id} on marker click.
    // Map reporting is a premium feature: free users can collect surveys but not view them on a map.
    [Authorize(Policy = "PremiumOnly")]
    [HttpGet("geojson")]
    public async Task<ActionResult<GeoJsonFeatureCollection>> GeoJson(
        [FromQuery] Guid? projectId,
        [FromQuery] double? minLat, [FromQuery] double? minLng,
        [FromQuery] double? maxLat, [FromQuery] double? maxLng,
        [FromQuery] int limit = 5000,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        limit = Math.Clamp(limit, 1, 10000);

        var query = _db.Surveys.AsNoTracking().Where(s => s.UserId == userId);

        if (projectId is not null)
            query = query.Where(s => s.ProjectId == projectId);

        if (minLat is not null && minLng is not null && maxLat is not null && maxLng is not null)
        {
            var bbox = _geometryFactory.ToGeometry(
                new Envelope(minLng.Value, maxLng.Value, minLat.Value, maxLat.Value));
            query = query.Where(s => s.Location.Intersects(bbox));
        }

        // Materialize before reading Location.X/.Y so the geography isn't dereferenced in SQL.
        var rows = await query
            .OrderByDescending(s => s.CapturedAtUtc)
            .Take(limit)
            .Select(s => new GeoRow(
                s.Id, s.ProjectId, s.Status, s.CapturedAtUtc, s.SyncedAtUtc,
                s.AccuracyMeters, s.Location, s.Photos.Count, s.Details))
            .ToListAsync(ct);

        var features = rows.Select(r => GeoJsonFeature.Point(
            r.Location.X, r.Location.Y,
            new SurveyFeatureProperties(
                r.Id, r.ProjectId, r.Status, r.CapturedAtUtc, r.SyncedAtUtc,
                r.AccuracyMeters, r.PhotoCount, r.Details))).ToList();

        return Ok(GeoJsonFeatureCollection.Of(features));
    }

    private sealed record GeoRow(
        Guid Id, Guid ProjectId, string Status, DateTime CapturedAtUtc, DateTime SyncedAtUtc,
        double? AccuracyMeters, Point Location, int PhotoCount, string? Details);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SurveyResponse>> Get(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var survey = await _db.Surveys
            .AsNoTracking()
            .Include(s => s.Photos)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

        return survey is null ? NotFound() : Ok(SurveyMapper.ToResponse(survey));
    }

    /// <summary>
    /// Keyed on the client-generated Id: a retried offline sync never creates a duplicate, and a
    /// survey edited offline and re-pushed is applied as an update rather than being silently
    /// ignored. Returns 201 for a new survey, 200 for an update.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SurveyResponse>> Upsert(UpsertSurveyRequest request, CancellationToken ct)
    {
        var result = await _sync.UpsertAsync(User.GetUserId(), request, ct);

        return result.Status switch
        {
            SyncOutcome.Created => CreatedAtAction(nameof(Get), new { id = result.Id },
                                                   SurveyMapper.ToResponse(result.Survey!)),
            SyncOutcome.Updated => Ok(SurveyMapper.ToResponse(result.Survey!)),
            SyncOutcome.QuotaExceeded => QuotaResults.QuotaExceeded(result.Errors.FirstOrDefault()),
            SyncOutcome.Forbidden => Forbid(),
            _ => BadRequest(new { error = "invalid_survey", errors = result.Errors })
        };
    }

}
