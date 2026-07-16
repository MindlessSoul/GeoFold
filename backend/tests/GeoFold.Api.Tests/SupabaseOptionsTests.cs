using GeoFold.Api.Services;

namespace GeoFold.Api.Tests;

public class SupabaseOptionsTests
{
    private static SupabaseOptions Valid(string? jwtSecret = null) => new()
    {
        Url = "https://abcdefgh.supabase.co",
        ServiceRoleKey = "service-role-key",
        StorageBucket = "survey-photos",
        JwtSecret = jwtSecret
    };

    // Regression guard for the bug that made every authenticated request return 500:
    // appsettings ships JwtSecret as "", which is NOT null, so a `is null` check let an empty
    // string through and SymmetricSecurityKey(0 bytes) threw IDX10703.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void BlankJwtSecretDoesNotCountAsLegacySharedSecret(string? secret) =>
        Assert.False(Valid(secret).UseLegacySharedSecret);

    [Fact]
    public void RealJwtSecretSelectsLegacySharedSecret() =>
        Assert.True(Valid("super-secret-value").UseLegacySharedSecret);

    [Theory]
    [InlineData("https://abcdefgh.supabase.co")]
    [InlineData("https://abcdefgh.supabase.co/")] // trailing slash must not double up
    public void IssuerMatchesTheIssClaimSupabaseMints(string url)
    {
        var options = Valid();
        options.Url = url;
        Assert.Equal("https://abcdefgh.supabase.co/auth/v1", options.Issuer);
    }

    [Theory]
    [InlineData("https://abcdefgh.supabase.co")]
    [InlineData("https://abcdefgh.supabase.co/")]
    public void JwksUrlPointsAtSupabasesWellKnownDocument(string url)
    {
        var options = Valid();
        options.Url = url;
        Assert.Equal("https://abcdefgh.supabase.co/auth/v1/.well-known/jwks.json", options.JwksUrl);
    }
}

public class SupabaseOptionsValidatorTests
{
    private static readonly SupabaseOptionsValidator Validator = new();

    private static SupabaseOptions Valid() => new()
    {
        Url = "https://abcdefgh.supabase.co",
        ServiceRoleKey = "service-role-key",
        StorageBucket = "survey-photos"
    };

    [Fact]
    public void FullyConfiguredOptionsPass() =>
        Assert.True(Validator.Validate(null, Valid()).Succeeded);

    [Fact]
    public void PlaceholderUrlIsRejected()
    {
        var options = Valid();
        options.Url = "https://YOUR-PROJECT.supabase.co";

        var result = Validator.Validate(null, options);

        Assert.True(result.Failed);
        Assert.Contains(result.Failures!, f => f.Contains("placeholder"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void MissingUrlIsRejected(string? url)
    {
        var options = Valid();
        options.Url = url!;
        Assert.True(Validator.Validate(null, options).Failed);
    }

    [Theory]
    [InlineData("http://abcdefgh.supabase.co")] // must be https
    [InlineData("abcdefgh.supabase.co")]        // must be absolute
    public void NonHttpsOrRelativeUrlIsRejected(string url)
    {
        var options = Valid();
        options.Url = url;
        Assert.True(Validator.Validate(null, options).Failed);
    }

    [Fact]
    public void MissingServiceRoleKeyIsRejected()
    {
        var options = Valid();
        options.ServiceRoleKey = "";
        Assert.True(Validator.Validate(null, options).Failed);
    }

    [Fact]
    public void EveryProblemIsReportedAtOnceRatherThanOneAtATime()
    {
        var options = new SupabaseOptions { Url = "", ServiceRoleKey = "", StorageBucket = "" };

        var result = Validator.Validate(null, options);

        Assert.True(result.Failed);
        Assert.Equal(3, result.Failures!.Count());
    }
}
