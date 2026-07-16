using Microsoft.Extensions.Options;

namespace GeoFold.Api.Services;

public class SupabaseOptions
{
    public const string SectionName = "Supabase";

    /// <summary>Project URL, e.g. https://abcdefgh.supabase.co</summary>
    public string Url { get; set; } = default!;

    /// <summary>Server-side only key used for Storage signed URLs. Never ship this to a client.</summary>
    public string ServiceRoleKey { get; set; } = default!;

    public string StorageBucket { get; set; } = "survey-photos";

    /// <summary>
    /// Legacy HS256 shared secret. Leave empty to verify access tokens against the project's
    /// asymmetric signing keys (ES256/RS256) via JWKS, which is what Supabase recommends.
    /// </summary>
    public string? JwtSecret { get; set; }

    /// <summary>True when the legacy symmetric secret is configured and should be used instead of JWKS.</summary>
    public bool UseLegacySharedSecret => !string.IsNullOrWhiteSpace(JwtSecret);

    private string BaseUrl => Url.TrimEnd('/');

    /// <summary>The `iss` claim Supabase puts in access tokens.</summary>
    public string Issuer => $"{BaseUrl}/auth/v1";

    /// <summary>
    /// Supabase publishes only a JWKS document (there is no OpenID Connect discovery endpoint),
    /// so signing keys are resolved from here rather than via JwtBearer's Authority.
    /// </summary>
    public string JwksUrl => $"{BaseUrl}/auth/v1/.well-known/jwks.json";
}

/// <summary>
/// Fails startup with an actionable message when Supabase config is missing or still a placeholder.
/// Without this the app boots "fine" and every authenticated request dies with an opaque 500.
/// </summary>
public sealed class SupabaseOptionsValidator : IValidateOptions<SupabaseOptions>
{
    public ValidateOptionsResult Validate(string? name, SupabaseOptions options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.Url))
        {
            failures.Add("Supabase:Url is not set. Set it to your project URL (e.g. https://abcdefgh.supabase.co).");
        }
        else if (options.Url.Contains("YOUR-PROJECT", StringComparison.OrdinalIgnoreCase))
        {
            failures.Add("Supabase:Url is still the placeholder 'https://YOUR-PROJECT.supabase.co'. "
                       + "Set the real value, e.g. dotnet user-secrets set \"Supabase:Url\" \"https://abcdefgh.supabase.co\".");
        }
        else if (!Uri.TryCreate(options.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            failures.Add($"Supabase:Url must be an absolute https URL, but was '{options.Url}'.");
        }

        if (string.IsNullOrWhiteSpace(options.ServiceRoleKey))
        {
            failures.Add("Supabase:ServiceRoleKey is not set; photo storage signed URLs cannot be issued without it. "
                       + "Set it via user-secrets (never commit it): dotnet user-secrets set \"Supabase:ServiceRoleKey\" \"<key>\".");
        }

        if (string.IsNullOrWhiteSpace(options.StorageBucket))
        {
            failures.Add("Supabase:StorageBucket is not set (expected something like 'survey-photos').");
        }

        return failures.Count > 0
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}
