namespace GeoFold.Api.DTOs;

public record CreateProjectRequest(string Name, string? Description, string? FormSchema);

public record ProjectResponse(
    Guid Id,
    string Name,
    string? Description,
    string FormSchema,
    DateTime CreatedAtUtc,
    DateTime? ArchivedAtUtc,
    int SurveyCount);
