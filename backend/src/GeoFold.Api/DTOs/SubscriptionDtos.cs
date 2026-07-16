namespace GeoFold.Api.DTOs;

public record SubscriptionMeResponse(
    string Plan,
    string Status,
    bool IsActive,
    DateTime? CurrentPeriodEndUtc,
    QuotaLimitsResponse Limits,
    QuotaUsageResponse Usage);

/// <summary>A null value means that dimension is unlimited on the current plan.</summary>
public record QuotaLimitsResponse(int? MaxProjects, int? MaxSurveysPerMonth, int? StorageQuotaMb);

public record QuotaUsageResponse(int Projects, int SurveysThisMonth, double StorageMb);
