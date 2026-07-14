namespace GeoFold.Api.DTOs;

// Minimal RFC 7946 GeoJSON shapes, built as plain objects so System.Text.Json emits standard
// GeoJSON (camelCase: type/geometry/coordinates/properties) without an extra serializer dependency.

public record GeoJsonFeatureCollection(string Type, IReadOnlyList<GeoJsonFeature> Features)
{
    public static GeoJsonFeatureCollection Of(IReadOnlyList<GeoJsonFeature> features) =>
        new("FeatureCollection", features);
}

public record GeoJsonFeature(string Type, GeoJsonPoint Geometry, SurveyFeatureProperties Properties)
{
    public static GeoJsonFeature Point(double lng, double lat, SurveyFeatureProperties props) =>
        new("Feature", new GeoJsonPoint("Point", new[] { lng, lat }), props);
}

// GeoJSON coordinate order is [longitude, latitude].
public record GeoJsonPoint(string Type, double[] Coordinates);

public record SurveyFeatureProperties(
    Guid Id,
    Guid ProjectId,
    string Status,
    DateTime CapturedAtUtc,
    DateTime SyncedAtUtc,
    double? AccuracyMeters,
    int PhotoCount,
    string? DetailsJson);
