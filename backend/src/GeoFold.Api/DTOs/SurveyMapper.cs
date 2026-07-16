using GeoFold.Api.Models;

namespace GeoFold.Api.DTOs;

public static class SurveyMapper
{
    public static SurveyResponse ToResponse(Survey s) => new(
        s.Id, s.ProjectId, s.Location.Y, s.Location.X, s.AccuracyMeters,
        s.CapturedAtUtc, s.SyncedAtUtc, s.Details, s.Status,
        s.Photos.Select(p => new SurveyPhotoResponse(
            p.Id, p.UploadStatus, p.Location.Y, p.Location.X, p.CapturedAtUtc)).ToList());
}
