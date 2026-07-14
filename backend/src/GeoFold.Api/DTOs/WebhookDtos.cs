namespace GeoFold.Api.DTOs;

public record SubscriptionWebhookPayload(
    Guid UserId,
    string Plan,
    string Status,
    string Provider,
    string? ProviderRef,
    DateTime? CurrentPeriodEndUtc);
