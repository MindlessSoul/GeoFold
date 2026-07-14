using NetTopologySuite.Geometries;

namespace GeoFold.Api.Models;

public static class UploadStatus
{
    public const string Pending = "pending";
    public const string Uploaded = "uploaded";
    public const string Failed = "failed";
}

public class SurveyPhoto
{
    public Guid Id { get; set; } // client-generated UUID
    public Guid SurveyId { get; set; }
    public Survey Survey { get; set; } = default!;

    public string StoragePath { get; set; } = default!; // Supabase Storage object path
    public Point Location { get; set; } = default!;
    public DateTime CapturedAtUtc { get; set; }

    public int? Width { get; set; }
    public int? Height { get; set; }
    public long? SizeBytes { get; set; }

    public string UploadStatus { get; set; } = Models.UploadStatus.Pending;
}
