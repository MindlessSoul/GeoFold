namespace GeoFold.Api.DTOs;

public record SyncPushRequest(IReadOnlyList<UpsertSurveyRequest> Surveys);

public record SyncItemResult(Guid Id, string Status, IReadOnlyList<string> Errors);

/// <summary>
/// Per-item outcomes: one bad survey must not sink a whole batch, so the client can retry or
/// surface exactly the items that failed instead of replaying everything.
/// </summary>
public record SyncPushResponse(int Accepted, int Rejected, IReadOnlyList<SyncItemResult> Results);

/// <summary>
/// <paramref name="Cursor"/> is the value to pass back as <c>since</c> on the next pull.
/// <paramref name="HasMore"/> is true when the page hit the limit and another pull is needed.
/// </summary>
public record SyncPullResponse(IReadOnlyList<SurveyResponse> Surveys, DateTime? Cursor, bool HasMore);
