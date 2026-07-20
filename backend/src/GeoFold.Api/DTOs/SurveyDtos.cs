using System.ComponentModel.DataAnnotations;

namespace GeoFold.Api.DTOs;

// Attributes sit on the constructor parameters, not [property:] — MVC throws for records with
// validation metadata on the generated properties instead.
public record UpsertSurveyRequest(
    Guid Id, // client-generated UUID, idempotency key
    Guid ProjectId,
    [Range(-90, 90)] double Latitude,
    [Range(-180, 180)] double Longitude,
    double? AccuracyMeters,
    DateTime CapturedAtUtc,
    [MaxLength(20_000)] string? DetailsJson);

public record SurveyResponse(
    Guid Id,
    Guid ProjectId,
    double Latitude,
    double Longitude,
    double? AccuracyMeters,
    DateTime CapturedAtUtc,
    DateTime SyncedAtUtc,
    string? DetailsJson,
    string Status,
    IReadOnlyList<SurveyPhotoResponse> Photos);

public record SurveyPhotoResponse(
    Guid Id,
    string UploadStatus,
    double Latitude,
    double Longitude,
    DateTime CapturedAtUtc);

public record InitiatePhotoRequest(
    Guid Id, // client-generated UUID
    string FileName,
    string ContentType,
    long SizeBytes,
    double Latitude,
    double Longitude,
    DateTime CapturedAtUtc);

public record InitiatePhotoResponse(Guid PhotoId, string UploadUrl, string StoragePath);
