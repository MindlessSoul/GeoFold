using NetTopologySuite.Geometries;

namespace GeoFold.Api.Models;

public static class SurveyStatus
{
    public const string Draft = "draft";
    public const string Submitted = "submitted";
    public const string Reviewed = "reviewed";
}

public class Survey
{
    public Guid Id { get; set; } // client-generated UUID, idempotency key for offline sync
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = default!;

    public Guid UserId { get; set; }
    public Profile User { get; set; } = default!;

    public Point Location { get; set; } = default!; // SRID 4326
    public double? AccuracyMeters { get; set; }
    public DateTime CapturedAtUtc { get; set; } // device time at capture
    public DateTime SyncedAtUtc { get; set; }

    public string? Details { get; set; } // jsonb, flexible form fields
    public string Status { get; set; } = SurveyStatus.Submitted;

    public ICollection<SurveyPhoto> Photos { get; set; } = new List<SurveyPhoto>();
}
