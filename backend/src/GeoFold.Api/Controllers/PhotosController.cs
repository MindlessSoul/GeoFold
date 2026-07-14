using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Quota;
using GeoFold.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace GeoFold.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/surveys/{surveyId:guid}/photos")]
public class PhotosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IStorageService _storage;
    private readonly GeometryFactory _geometryFactory;
    private readonly IQuotaService _quota;

    public PhotosController(AppDbContext db, IStorageService storage, GeometryFactory geometryFactory, IQuotaService quota)
    {
        _db = db;
        _storage = storage;
        _geometryFactory = geometryFactory;
        _quota = quota;
    }

    [HttpPost("initiate")]
    public async Task<ActionResult<InitiatePhotoResponse>> Initiate(
        Guid surveyId, InitiatePhotoRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var survey = await _db.Surveys.FirstOrDefaultAsync(s => s.Id == surveyId && s.UserId == userId, ct);
        if (survey is null)
            return NotFound();

        var existing = await _db.SurveyPhotos.FirstOrDefaultAsync(p => p.Id == request.Id, ct);
        var storagePath = $"{userId}/{surveyId}/{request.Id}_{request.FileName}";

        if (existing is null)
        {
            // Storage quota — only charged for genuinely new photos; retried initiations reuse the row.
            var quota = await _quota.CheckPhotoUploadAsync(userId, request.SizeBytes, ct);
            if (!quota.Allowed)
                return QuotaResults.QuotaExceeded(quota.Message);

            existing = new SurveyPhoto
            {
                Id = request.Id,
                SurveyId = surveyId,
                StoragePath = storagePath,
                Location = _geometryFactory.CreatePoint(new Coordinate(request.Longitude, request.Latitude)),
                CapturedAtUtc = request.CapturedAtUtc,
                SizeBytes = request.SizeBytes,
                UploadStatus = Models.UploadStatus.Pending
            };
            _db.SurveyPhotos.Add(existing);
            await _db.SaveChangesAsync(ct);
        }

        var uploadUrl = await _storage.CreateUploadUrlAsync(existing.StoragePath, ct);
        return Ok(new InitiatePhotoResponse(existing.Id, uploadUrl, existing.StoragePath));
    }

    [HttpPost("{photoId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid surveyId, Guid photoId, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var photo = await _db.SurveyPhotos
            .Include(p => p.Survey)
            .FirstOrDefaultAsync(p => p.Id == photoId && p.SurveyId == surveyId
                                      && p.Survey.UserId == userId, ct);
        if (photo is null)
            return NotFound();

        if (!await _storage.ExistsAsync(photo.StoragePath, ct))
            return BadRequest("Upload not found in storage yet.");

        photo.UploadStatus = Models.UploadStatus.Uploaded;
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpGet("{photoId:guid}/url")]
    public async Task<ActionResult<string>> GetDownloadUrl(Guid surveyId, Guid photoId, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var photo = await _db.SurveyPhotos
            .Include(p => p.Survey)
            .FirstOrDefaultAsync(p => p.Id == photoId && p.SurveyId == surveyId
                                      && p.Survey.UserId == userId, ct);
        if (photo is null)
            return NotFound();

        var url = await _storage.CreateDownloadUrlAsync(photo.StoragePath, TimeSpan.FromMinutes(15), ct);
        return Ok(new { url });
    }
}
