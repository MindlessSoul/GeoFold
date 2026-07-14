namespace GeoFold.Api.Export;

public class SurveyExportRow
{
    public Guid SurveyId { get; set; }
    public string ProjectName { get; set; } = default!;
    public string? SurveyorName { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public DateTime CapturedAtUtc { get; set; }
    public string Status { get; set; } = default!;
    public string? DetailsJson { get; set; }
    public int PhotoCount { get; set; }
}
