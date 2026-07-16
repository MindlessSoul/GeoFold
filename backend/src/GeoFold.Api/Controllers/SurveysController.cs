using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Quota;
using GeoFold.Api.Validation;
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
    private readonly IQuotaService _quota;

    public SurveysController(AppDbContext db, GeometryFactory geometryFactory, IQuotaService quota)
    {
        _db = db;
        _geometryFactory = geometryFactory;
        _quota = quota;
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

        return Ok(surveys.Select(ToResponse));
    }

    // Map/report feed for the SPA: a GeoJSON FeatureCollection of the caller's surveys,
    // filterable by project and viewport bbox. Lightweight per marker (photoCount only);
    // the SPA fetches full detail + photo URLs via GET {id} on marker click.
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

        return survey is null ? NotFound() : Ok(ToResponse(survey));
    }

    /// <summary>
    /// Keyed on the client-generated Id: a retried offline sync never creates a duplicate, and a
    /// survey edited offline and re-pushed is applied as an update rather than being silently
    /// ignored. Returns 201 for a new survey, 200 for an update.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SurveyResponse>> Upsert(UpsertSurveyRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        // Needed by both paths: the target project must be the caller's, and form_data is validated
        // against its schema on update as well as create.
        var project = await _db.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, ct);
        if (project is null)
            return BadRequest("Project not found or not owned by the current user.");

        var schema = FormSchemaValidator.ParseSchema(project.FormSchema, out _);
        var formErrors = FormSchemaValidator.Validate(request.DetailsJson, schema);
        if (formErrors.Count > 0)
            return BadRequest(new { error = "invalid_form_data", errors = formErrors });

        var location = _geometryFactory.CreatePoint(new Coordinate(request.Longitude, request.Latitude));

        var existing = await _db.Surveys
            .Include(s => s.Photos)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct);

        if (existing is not null)
        {
            if (existing.UserId != userId)
                return Forbid();

            // Last write wins. Status is owned by the review workflow, not the sync payload, so it
            // is left alone; the monthly quota is not charged again for an existing survey.
            existing.ProjectId = request.ProjectId;
            existing.Location = location;
            existing.AccuracyMeters = request.AccuracyMeters;
            existing.CapturedAtUtc = request.CapturedAtUtc;
            existing.Details = request.DetailsJson;
            existing.SyncedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ToResponse(existing));
        }

        var quota = await _quota.CheckSurveyCreationAsync(userId, ct);
        if (!quota.Allowed)
            return QuotaResults.QuotaExceeded(quota.Message);

        var survey = new Survey
        {
            Id = request.Id,
            ProjectId = request.ProjectId,
            UserId = userId,
            Location = location,
            AccuracyMeters = request.AccuracyMeters,
            CapturedAtUtc = request.CapturedAtUtc,
            SyncedAtUtc = DateTime.UtcNow,
            Details = request.DetailsJson,
            Status = Models.SurveyStatus.Submitted
        };

        _db.Surveys.Add(survey);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = survey.Id }, ToResponse(survey));
    }

    private static SurveyResponse ToResponse(Survey s) => new(
        s.Id, s.ProjectId, s.Location.Y, s.Location.X, s.AccuracyMeters,
        s.CapturedAtUtc, s.SyncedAtUtc, s.Details, s.Status,
        s.Photos.Select(p => new SurveyPhotoResponse(
            p.Id, p.UploadStatus, p.Location.Y, p.Location.X, p.CapturedAtUtc)).ToList());
}
