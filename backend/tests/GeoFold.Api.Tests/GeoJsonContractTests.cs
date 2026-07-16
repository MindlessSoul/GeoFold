using System.Text.Json;
using GeoFold.Api.DTOs;

namespace GeoFold.Api.Tests;

/// <summary>
/// Pins the wire shape the map SPA consumes. Serialized with the same options ASP.NET Core uses
/// (JsonSerializerDefaults.Web), so these assertions reflect what actually goes over the wire.
/// </summary>
public class GeoJsonContractTests
{
    private const double Lng = 106.827153;  // Jakarta
    private const double Lat = -6.175392;

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private static string SerializeSample() =>
        JsonSerializer.Serialize(
            GeoJsonFeatureCollection.Of(new[]
            {
                GeoJsonFeature.Point(Lng, Lat, new SurveyFeatureProperties(
                    Guid.NewGuid(), Guid.NewGuid(), "submitted",
                    DateTime.UtcNow, DateTime.UtcNow, 4.5, 2, """{"note":"ok"}"""))
            }),
            Web);

    [Theory]
    [InlineData("\"type\":\"FeatureCollection\"")]
    [InlineData("\"type\":\"Feature\"")]
    [InlineData("\"type\":\"Point\"")]
    [InlineData("\"properties\":")]
    [InlineData("\"photoCount\":2")]
    public void EmitsRfc7946Shape(string expectedFragment) =>
        Assert.Contains(expectedFragment, SerializeSample());

    // GeoJSON is [longitude, latitude] — swapping these silently puts every marker in the wrong
    // place (Jakarta would land in the Indian Ocean), so it is worth pinning explicitly.
    // Built with invariant culture: JSON numbers always use '.', but string interpolation would
    // follow the machine's locale (id-ID renders 106,827153) and fail for the wrong reason.
    [Fact]
    public void CoordinatesAreLongitudeThenLatitude() =>
        Assert.Contains(
            FormattableString.Invariant($"\"coordinates\":[{Lng},{Lat}]"),
            SerializeSample());

    [Fact]
    public void RoundTripsBackToAFeatureCollection()
    {
        var back = JsonSerializer.Deserialize<GeoJsonFeatureCollection>(SerializeSample(), Web);

        Assert.NotNull(back);
        Assert.Equal("FeatureCollection", back!.Type);
        var feature = Assert.Single(back.Features);
        Assert.Equal(Lng, feature.Geometry.Coordinates[0]);
        Assert.Equal(Lat, feature.Geometry.Coordinates[1]);
    }
}
