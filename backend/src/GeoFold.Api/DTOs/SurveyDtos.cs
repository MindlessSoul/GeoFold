namespace GeoFold.Api.DTOs;

public record UpsertSurveyRequest(
    Guid Id, // client-generated UUID, idempotency key
    Guid ProjectId,
    double Latitude,
    double Longitude,
    double? AccuracyMeters,
    DateTime CapturedAtUtc,
    string? DetailsJson);

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
