using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.Export;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Controllers;

[ApiController]
[Authorize(Policy = "PremiumOnly")]
[Route("api/v1/projects/{projectId:guid}/exports")]
public class ExportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ExportService _exportService;

    public ExportsController(AppDbContext db, ExportService exportService)
    {
        _db = db;
        _exportService = exportService;
    }

    // Small/medium result sets: generate synchronously and stream back.
    // Move to a background job (e.g. Hangfire) once exports commonly exceed ~5k rows.
    [HttpGet]
    public async Task<IActionResult> Export(
        Guid projectId, [FromQuery] string format = "xlsx", CancellationToken ct = default)
    {
        var userId = User.GetUserId();

        var project = await _db.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == userId, ct);
        if (project is null)
            return NotFound();

        if (!Enum.TryParse<ExportFormat>(format, ignoreCase: true, out var exportFormat))
            return BadRequest("format must be 'csv' or 'xlsx'.");

        var rows = await _db.Surveys
            .AsNoTracking()
            .Where(s => s.ProjectId == projectId)
            .Select(s => new SurveyExportRow
            {
                SurveyId = s.Id,
                ProjectName = project.Name,
                SurveyorName = s.User.DisplayName,
                Latitude = s.Location.Y,
                Longitude = s.Location.X,
                AccuracyMeters = s.AccuracyMeters,
                CapturedAtUtc = s.CapturedAtUtc,
                Status = s.Status,
                DetailsJson = s.Details,
                PhotoCount = s.Photos.Count
            })
            .ToListAsync(ct);

        var bytes = _exportService.Generate(rows, exportFormat);
        var slug = string.Concat(project.Name.Where(c => char.IsLetterOrDigit(c) || c == '-')).ToLowerInvariant();
        var fileName = $"{slug}_{project.Id:N}_{DateTime.UtcNow:yyyyMMddHHmm}.{ExportService.FileExtension(exportFormat)}";

        return File(bytes, ExportService.ContentType(exportFormat), fileName);
    }
}
