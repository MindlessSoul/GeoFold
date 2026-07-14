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

    // Idempotent on Id: retried offline-sync uploads never create duplicates.
    [HttpPost]
    public async Task<ActionResult<SurveyResponse>> Upsert(UpsertSurveyRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var existing = await _db.Surveys
            .Include(s => s.Photos)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct);

        if (existing is not null)
        {
            return existing.UserId == userId
                ? Ok(ToResponse(existing))
                : Forbid();
        }

        var project = await _db.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, ct);
        if (project is null)
            return BadRequest("Project not found or not owned by the current user.");

        // Validate the submitted form_data against the project's form_schema.
        var schema = FormSchemaValidator.ParseSchema(project.FormSchema, out _);
        var formErrors = FormSchemaValidator.Validate(request.DetailsJson, schema);
        if (formErrors.Count > 0)
            return BadRequest(new { error = "invalid_form_data", errors = formErrors });

        // Monthly survey quota — only new surveys reach here; retried syncs short-circuit above.
        var quota = await _quota.CheckSurveyCreationAsync(userId, ct);
        if (!quota.Allowed)
            return QuotaResults.QuotaExceeded(quota.Message);

        var survey = new Survey
        {
            Id = request.Id,
            ProjectId = request.ProjectId,
            UserId = userId,
            Location = _geometryFactory.CreatePoint(new Coordinate(request.Longitude, request.Latitude)),
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
