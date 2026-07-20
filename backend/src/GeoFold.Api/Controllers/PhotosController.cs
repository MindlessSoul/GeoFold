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
    private const long MaxPhotoBytes = 20L * 1024 * 1024;

    // Whitelist drives both validation and the stored file extension.
    private static readonly Dictionary<string, string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = "jpg",
        ["image/png"] = "png",
        ["image/webp"] = "webp",
    };

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

        if (!AllowedImageTypes.TryGetValue(request.ContentType, out var extension))
            return BadRequest(new { error = "unsupported_content_type", message = "Photos must be JPEG, PNG or WebP." });

        if (request.SizeBytes <= 0 || request.SizeBytes > MaxPhotoBytes)
            return BadRequest(new { error = "invalid_size", message = $"A photo must be between 1 byte and {MaxPhotoBytes / (1024 * 1024)} MB." });

        var existing = await _db.SurveyPhotos.FirstOrDefaultAsync(p => p.Id == request.Id, ct);

        // Built purely from ids we control plus a whitelisted extension. The client-supplied file
        // name is deliberately not used: it could contain "../" and escape the user's folder.
        var storagePath = $"{userId}/{surveyId}/{request.Id}.{extension}";

        if (existing is null)
        {
            // Provisional charge against the declared size; the real size is verified on complete.
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

        // The size declared at initiate is client-controlled, so storage quota is settled against
        // what was actually stored — otherwise a client could declare 1 byte and upload gigabytes.
        var actualSize = await _storage.GetSizeAsync(photo.StoragePath, ct);
        if (actualSize is { } bytes && bytes != photo.SizeBytes)
        {
            var declared = photo.SizeBytes ?? 0;
            photo.SizeBytes = bytes;

            if (bytes > declared)
            {
                var extra = bytes - declared;
                var quota = await _quota.CheckPhotoUploadAsync(userId, extra, ct);
                if (!quota.Allowed)
                {
                    photo.UploadStatus = Models.UploadStatus.Failed;
                    await _db.SaveChangesAsync(ct);
                    return QuotaResults.QuotaExceeded(quota.Message);
                }
            }
        }

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
