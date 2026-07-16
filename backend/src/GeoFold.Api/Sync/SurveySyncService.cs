using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Quota;
using GeoFold.Api.Validation;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace GeoFold.Api.Sync;

/// <summary>Per-item outcome of a sync push. Follows the string-constant style used by the models.</summary>
public static class SyncOutcome
{
    public const string Created = "created";
    public const string Updated = "updated";
    public const string Rejected = "rejected";            // unknown project, or form_data failed the schema
    public const string QuotaExceeded = "quota_exceeded";
    public const string Forbidden = "forbidden";          // that Id already belongs to another user
}

public sealed record SurveyUpsertResult(Guid Id, string Status, IReadOnlyList<string> Errors, Survey? Survey);

public interface ISurveySyncService
{
    Task<SurveyUpsertResult> UpsertAsync(Guid userId, UpsertSurveyRequest request, CancellationToken ct = default);
}

/// <summary>
/// The single implementation of "apply one survey from a client". Both POST /surveys and the batch
/// sync endpoint go through here, so ownership, schema validation and quota can't drift apart
/// between the online and offline paths.
/// </summary>
public class SurveySyncService : ISurveySyncService
{
    private readonly AppDbContext _db;
    private readonly GeometryFactory _geometryFactory;
    private readonly IQuotaService _quota;

    public SurveySyncService(AppDbContext db, GeometryFactory geometryFactory, IQuotaService quota)
    {
        _db = db;
        _geometryFactory = geometryFactory;
        _quota = quota;
    }

    public async Task<SurveyUpsertResult> UpsertAsync(
        Guid userId, UpsertSurveyRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, ct);
        if (project is null)
            return Rejected(request.Id, "Project not found or not owned by the current user.");

        var schema = FormSchemaValidator.ParseSchema(project.FormSchema, out _);
        var formErrors = FormSchemaValidator.Validate(request.DetailsJson, schema);
        if (formErrors.Count > 0)
            return new SurveyUpsertResult(request.Id, SyncOutcome.Rejected, formErrors, null);

        var location = _geometryFactory.CreatePoint(new Coordinate(request.Longitude, request.Latitude));

        var existing = await _db.Surveys
            .Include(s => s.Photos)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct);

        if (existing is not null)
        {
            if (existing.UserId != userId)
                return new SurveyUpsertResult(
                    request.Id, SyncOutcome.Forbidden, ["Survey belongs to another user."], null);

            // Last write wins. Status belongs to the review workflow, not the sync payload, and an
            // existing survey is not charged against the monthly quota again.
            existing.ProjectId = request.ProjectId;
            existing.Location = location;
            existing.AccuracyMeters = request.AccuracyMeters;
            existing.CapturedAtUtc = request.CapturedAtUtc;
            existing.Details = request.DetailsJson;
            existing.SyncedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return new SurveyUpsertResult(request.Id, SyncOutcome.Updated, [], existing);
        }

        var quota = await _quota.CheckSurveyCreationAsync(userId, ct);
        if (!quota.Allowed)
            return new SurveyUpsertResult(
                request.Id, SyncOutcome.QuotaExceeded, [quota.Message ?? "Quota exceeded."], null);

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
            Status = SurveyStatus.Submitted
        };

        _db.Surveys.Add(survey);
        await _db.SaveChangesAsync(ct);

        return new SurveyUpsertResult(request.Id, SyncOutcome.Created, [], survey);
    }

    private static SurveyUpsertResult Rejected(Guid id, string error) =>
        new(id, SyncOutcome.Rejected, [error], null);
}
