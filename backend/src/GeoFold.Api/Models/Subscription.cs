namespace GeoFold.Api.Models;

public static class SubscriptionPlan
{
    public const string Free = "free";
    public const string Premium = "premium";
}

public static class SubscriptionStatus
{
    public const string Active = "active";
    public const string PastDue = "past_due";
    public const string Canceled = "canceled";
    public const string Trialing = "trialing";
}

public class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Profile User { get; set; } = default!;

    public string Plan { get; set; } = SubscriptionPlan.Free;
    public string Status { get; set; } = SubscriptionStatus.Canceled;
    public string Provider { get; set; } = default!; // stripe | revenuecat | play | apple
    public string? ProviderRef { get; set; }
    public DateTime? CurrentPeriodEndUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    // Per-user quota overrides. Null = fall back to the plan default (see PlanQuotas). Null on an unlimited plan = unlimited.
    public int? MaxProjects { get; set; }
    public int? MaxSurveysPerMonth { get; set; }
    public int? StorageQuotaMb { get; set; }

    public bool IsActive => Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing;
}
