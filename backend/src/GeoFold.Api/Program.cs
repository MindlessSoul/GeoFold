using System.Security.Claims;
using System.Threading.RateLimiting;
using GeoFold.Api.Authentication;
using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.Export;
using GeoFold.Api.Quota;
using GeoFold.Api.Services;
using GeoFold.Api.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NetTopologySuite;
using NetTopologySuite.Geometries;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Generic ProblemDetails for unhandled errors, so failures never leak stack traces in production.
builder.Services.AddProblemDetails();

// Rate limiting. Buckets are per authenticated user, falling back to remote IP for anonymous
// traffic, so one abusive caller can't exhaust the API (or run up storage/DB cost) for everyone.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var key = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? context.User.FindFirstValue("sub")
                  ?? context.Connection.RemoteIpAddress?.ToString()
                  ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
});

// CORS for the separate SPA frontend. Bearer-token auth (no cookies), so credentials aren't needed.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        o => o.UseNetTopologySuite()));

builder.Services.AddSingleton<GeometryFactory>(
    NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326));

// Meant to fail fast on missing/placeholder Supabase config instead of booting an app whose every
// authenticated request dies later. NOTE: the guard does not fire yet — see SupabaseConfigurationGuard.
builder.Services.AddSingleton<IValidateOptions<SupabaseOptions>, SupabaseOptionsValidator>();
builder.Services.AddOptions<SupabaseOptions>()
    .Bind(builder.Configuration.GetSection(SupabaseOptions.SectionName));
builder.Services.AddHostedService<SupabaseConfigurationGuard>();

builder.Services.AddHttpClient<IStorageService, SupabaseStorageService>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ISubscriptionCache, SubscriptionCache>();
builder.Services.AddScoped<IAuthorizationHandler, ActiveSubscriptionHandler>();
builder.Services.AddScoped<IQuotaService, QuotaService>();
builder.Services.AddScoped<ISurveySyncService, SurveySyncService>();
builder.Services.AddSingleton<ExportService>();

builder.Services.AddSupabaseJwtAuthentication();

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("PremiumOnly", p => p.Requirements.Add(new ActiveSubscriptionRequirement()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler();
    // Tell browsers to stick to HTTPS for this host on subsequent visits.
    app.UseHsts();
}

// Baseline hardening headers on every response. This is a JSON API, so the important ones are
// no MIME sniffing, no framing, and not leaking the URL to third parties via Referer.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    await next();
});

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();

// After authentication so limits are per user where possible, before authorization so a flood
// never reaches the database.
app.UseRateLimiter();

app.UseAuthorization();

// Public, dependency-free liveness probe. Doubles as the pre-warm target the SPA pings so the
// container wakes from a cold start while the user is still filling in a survey, and as the
// health endpoint for Render / an uptime pinger. Excluded from rate limiting.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .AllowAnonymous()
    .DisableRateLimiting();

app.MapControllers();

app.Run();
