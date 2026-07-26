using Microsoft.Extensions.Options;

namespace GeoFold.Api.Services;

/// <summary>
/// Intended to force <see cref="SupabaseOptions"/> validation during host startup, so bad config
/// stops the app with an actionable message instead of letting it serve traffic that only fails
/// later (the old behaviour: boots fine, Swagger works, every API call returns 500).
/// <para>
/// This works: booting in Production with the placeholder <c>appsettings.json</c> aborts startup
/// with the actionable message. It previously looked broken only because it was always tested in
/// Development, where <c>appsettings.Development.json</c> supplies real config, so the validator
/// had nothing to reject. Verified 2026-07 by running with ASPNETCORE_ENVIRONMENT=Production and
/// placeholder config (host failed to start) and again with real config injected (booted clean).
/// </para>
/// <para>
/// Hosted services do not run under <c>dotnet ef</c> design-time (it builds the host but never
/// starts it), so whatever the fix is, EF migrations tooling must keep working without real
/// Supabase config — verified via <c>dotnet ef migrations list --no-connect</c>.
/// </para>
/// </summary>
public sealed class SupabaseConfigurationGuard : IHostedService
{
    private readonly IOptions<SupabaseOptions> _options;

    public SupabaseConfigurationGuard(IOptions<SupabaseOptions> options) => _options = options;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Touching .Value runs SupabaseOptionsValidator; a failure throws OptionsValidationException
        // and aborts startup with the actionable message.
        _ = _options.Value;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
