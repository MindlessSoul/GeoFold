using GeoFold.Api.Models;
using GeoFold.Api.Quota;

namespace GeoFold.Api.Tests;

public class PlanQuotasTests
{
    private static Subscription Sub(string plan, string status, int? maxProjects = null) => new()
    {
        Plan = plan,
        Status = status,
        Provider = "stripe",
        MaxProjects = maxProjects
    };

    [Fact]
    public void NoSubscriptionFallsBackToTheFreePlan()
    {
        var limits = PlanQuotas.Resolve(null);
        Assert.Equal(PlanQuotas.Free, limits);
    }

    [Theory]
    [InlineData(SubscriptionStatus.Active)]
    [InlineData(SubscriptionStatus.Trialing)] // trialing is a paying-equivalent state
    public void ActivePremiumGetsPremiumLimits(string status)
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, status));
        Assert.Equal(PlanQuotas.Premium, limits);
    }

    [Theory]
    [InlineData(SubscriptionStatus.Canceled)]
    [InlineData(SubscriptionStatus.PastDue)]
    public void InactivePremiumDropsBackToFreeLimits(string status)
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, status));
        Assert.Equal(PlanQuotas.Free, limits);
    }

    [Fact]
    public void PerUserOverrideBeatsThePlanDefault()
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Free, SubscriptionStatus.Active, maxProjects: 50));

        Assert.Equal(50, limits.MaxProjects);
        // Untouched dimensions still come from the plan.
        Assert.Equal(PlanQuotas.Free.MaxSurveysPerMonth, limits.MaxSurveysPerMonth);
        Assert.Equal(PlanQuotas.Free.StorageQuotaMb, limits.StorageQuotaMb);
    }

    [Fact]
    public void NullOverrideOnAnUnlimitedPlanStaysUnlimited()
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, SubscriptionStatus.Active));
        Assert.Null(limits.MaxProjects); // null == unlimited
    }

    // GeoFold has exactly two tiers (Free, Premium) and no partner/bespoke tier, so an override
    // is only ever an attribute of a live paid subscription. Once it lapses the user is a free
    // user, override or not — otherwise a canceled account keeps a paid ceiling.
    [Fact]
    public void CanceledSubscriptionLosesPerUserOverride()
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, SubscriptionStatus.Canceled, maxProjects: 50));

        Assert.Equal(PlanQuotas.Free, limits);
    }

    [Fact]
    public void TrialingSubscriptionKeepsPerUserOverride()
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, SubscriptionStatus.Trialing, maxProjects: 50));

        Assert.Equal(50, limits.MaxProjects);
    }

    [Fact]
    public void PastDueSubscriptionLosesPerUserOverride()
    {
        var limits = PlanQuotas.Resolve(Sub(SubscriptionPlan.Premium, SubscriptionStatus.PastDue, maxProjects: 50));

        Assert.Equal(PlanQuotas.Free, limits);
    }
}
