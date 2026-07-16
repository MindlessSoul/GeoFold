using System.Text;
using GeoFold.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Tokens;

namespace GeoFold.Api.Authentication;

public static class SupabaseAuthenticationExtensions
{
    /// <summary>
    /// Validates Supabase access tokens.
    /// <para>
    /// Deliberately does NOT set <c>Authority</c>: that makes JwtBearer fetch an OpenID Connect
    /// discovery document (<c>/.well-known/openid-configuration</c>), which Supabase does not
    /// publish — it exposes a JWKS document only. The issuer is known up front, so it is set
    /// explicitly and signing keys come straight from JWKS.
    /// </para>
    /// <para>
    /// Key source is chosen from config: the legacy HS256 shared secret when
    /// <c>Supabase:JwtSecret</c> is set, otherwise the project's asymmetric keys (ES256/RS256)
    /// via JWKS, which is Supabase's recommended setup.
    /// </para>
    /// </summary>
    public static IServiceCollection AddSupabaseJwtAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        // Configured against the validated SupabaseOptions, so this never runs on placeholder config
        // (SupabaseOptionsValidator + ValidateOnStart stop the app first).
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<SupabaseOptions>>((jwt, supabaseOptions) =>
            {
                var supabase = supabaseOptions.Value;

                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = supabase.Issuer,
                    ValidateAudience = true,
                    ValidAudience = "authenticated",
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true
                };

                if (supabase.UseLegacySharedSecret)
                {
                    // Legacy symmetric secret. Guarded by UseLegacySharedSecret (IsNullOrWhiteSpace):
                    // an empty string here would build a zero-length key and throw IDX10703.
                    jwt.TokenValidationParameters.IssuerSigningKey =
                        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabase.JwtSecret!));
                }
                else
                {
                    jwt.TokenValidationParameters.IssuerSigningKeyResolver =
                        BuildJwksKeyResolver(supabase.JwksUrl);
                }
            });

        return services;
    }

    private static IssuerSigningKeyResolver BuildJwksKeyResolver(string jwksUrl)
    {
        // ConfigurationManager caches the key set and refreshes it in the background, so key
        // rotation on the Supabase side is picked up without a redeploy, and a transient JWKS
        // outage keeps serving the last good keys instead of failing every request.
        var jwks = new ConfigurationManager<JsonWebKeySet>(
            jwksUrl,
            new JwksRetriever(),
            new HttpDocumentRetriever { RequireHttps = true })
        {
            // Supabase edge-caches JWKS for ~10 minutes and advises against caching longer,
            // otherwise revoking a key becomes slow.
            AutomaticRefreshInterval = TimeSpan.FromMinutes(10)
        };

        return (_, _, kid, _) =>
        {
            var keys = jwks.GetConfigurationAsync(CancellationToken.None)
                .GetAwaiter().GetResult()
                .GetSigningKeys();

            // Match the token's kid so rotation (old + new key published together) resolves correctly.
            return string.IsNullOrEmpty(kid)
                ? keys
                : keys.Where(k => string.Equals(k.KeyId, kid, StringComparison.Ordinal));
        };
    }

    private sealed class JwksRetriever : IConfigurationRetriever<JsonWebKeySet>
    {
        public async Task<JsonWebKeySet> GetConfigurationAsync(
            string address, IDocumentRetriever retriever, CancellationToken cancel)
        {
            var json = await retriever.GetDocumentAsync(address, cancel).ConfigureAwait(false);
            return new JsonWebKeySet(json);
        }
    }
}
