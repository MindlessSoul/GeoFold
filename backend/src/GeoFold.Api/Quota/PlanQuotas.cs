using GeoFold.Api.Models;

namespace GeoFold.Api.Quota;

/// <summary>
/// Effective quota ceiling for a user. A <c>null</c> value means "unlimited" for that dimension.
/// </summary>
public sealed record QuotaLimits(int? MaxProjects, int? MaxSurveysPerMonth, int? StorageQuotaMb);

/// <summary>Current consumption for a user, to be read alongside <see cref="QuotaLimits"/>.</summary>
public sealed record QuotaUsage(int Projects, int SurveysThisMonth, long StorageBytes);

/// <summary>
/// Result of a single quota check. <see cref="Allowed"/> gates the action; <see cref="Message"/>
/// is a human-readable reason surfaced to the client when denied.
/// </summary>
public readonly record struct QuotaCheckResult(bool Allowed, string? Message)
{
    public static QuotaCheckResult Ok { get; } = new(true, null);
    public static QuotaCheckResult Deny(string message) => new(false, message);
}

/// <summary>
/// Default quota ceilings per subscription plan. These are the single source of truth for
/// limits; per-user overrides live on the <see cref="Subscription"/> row and win when non-null.
/// Tune the numbers here.
/// </summary>
public static class PlanQuotas
{
    public static readonly QuotaLimits Free = new(MaxProjects: 3, MaxSurveysPerMonth: 100, StorageQuotaMb: 500);
    public static readonly QuotaLimits Premium = new(MaxProjects: null, MaxSurveysPerMonth: null, StorageQuotaMb: 51_200);

    public static QuotaLimits For(string plan) =>
        plan == SubscriptionPlan.Premium ? Premium : Free;

    /// <summary>
    /// The effective ceiling for a subscription: the plan default, with any non-null per-user
    /// override on the subscription row taking precedence. A missing or inactive subscription
    /// falls back to the free plan. Pure, so it is testable without a database.
    /// </summary>
    public static QuotaLimits Resolve(Subscription? subscription)
    {
        var effectivePlan = subscription is { IsActive: true } ? subscription.Plan : SubscriptionPlan.Free;
        var baseLimits = For(effectivePlan);

        if (subscription is null)
            return baseLimits;

        return new QuotaLimits(
            subscription.MaxProjects ?? baseLimits.MaxProjects,
            subscription.MaxSurveysPerMonth ?? baseLimits.MaxSurveysPerMonth,
            subscription.StorageQuotaMb ?? baseLimits.StorageQuotaMb);
    }
}
