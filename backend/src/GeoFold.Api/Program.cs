using GeoFold.Api.Authentication;
using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.Export;
using GeoFold.Api.Quota;
using GeoFold.Api.Services;
using GeoFold.Api.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NetTopologySuite;
using NetTopologySuite.Geometries;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
