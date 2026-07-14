using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.Export;
using GeoFold.Api.Quota;
using GeoFold.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite;
using NetTopologySuite.Geometries;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        o => o.UseNetTopologySuite()));

builder.Services.AddSingleton<GeometryFactory>(
    NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326));

builder.Services.Configure<SupabaseOptions>(
    builder.Configuration.GetSection(SupabaseOptions.SectionName));
builder.Services.AddHttpClient<IStorageService, SupabaseStorageService>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ISubscriptionCache, SubscriptionCache>();
builder.Services.AddScoped<IAuthorizationHandler, ActiveSubscriptionHandler>();
builder.Services.AddScoped<IQuotaService, QuotaService>();
builder.Services.AddSingleton<ExportService>();

var supabaseUrl = builder.Configuration["Supabase:Url"]!;
var supabaseJwtSecret = builder.Configuration["Supabase:JwtSecret"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"{supabaseUrl}/auth/v1";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseUrl}/auth/v1",
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true,
            // Supabase's default JWT secret is symmetric (HS256); switch to Authority-based
            // JWKS validation instead if the project is configured for asymmetric (RS256) keys.
            IssuerSigningKey = supabaseJwtSecret is null
                ? null
                : new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(supabaseJwtSecret))
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("PremiumOnly", p => p.Requirements.Add(new ActiveSubscriptionRequirement()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
