using Microsoft.Extensions.Options;

namespace GeoFold.Api.Services;

/// <summary>
/// Intended to force <see cref="SupabaseOptions"/> validation during host startup, so bad config
/// stops the app with an actionable message instead of letting it serve traffic that only fails
/// later (the old behaviour: boots fine, Swagger works, every API call returns 500).
/// <para>
/// KNOWN GAP: this does not fire yet. Booting with the placeholder <c>appsettings.json</c>
/// (Supabase:Url still "https://YOUR-PROJECT.supabase.co", empty ServiceRoleKey) still produces a
/// healthy server, so <see cref="SupabaseOptionsValidator"/> is not being invoked on this path.
/// <c>OptionsBuilder.ValidateOnStart()</c> did not fire either. Root cause not yet identified — do
/// not rely on this guard for config safety until it is fixed and re-verified by booting with
/// placeholder config and observing a startup failure.
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
        // Touching .Value is meant to run SupabaseOptionsValidator and throw
        // OptionsValidationException, aborting startup. See the KNOWN GAP note above.
        _ = _options.Value;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
