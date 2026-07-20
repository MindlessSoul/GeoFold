using System.ComponentModel.DataAnnotations;

namespace GeoFold.Api.DTOs;

// Caps keep a caller from parking megabytes of text in the database. [ApiController] rejects
// violations with a 400 before any handler runs.
// Attributes sit on the constructor parameters, not [property:] — MVC throws for records with
// validation metadata on the generated properties instead.
public record CreateProjectRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [MaxLength(20_000)] string? FormSchema);

public record UpdateProjectRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(1000)] string? Description,
    [MaxLength(20_000)] string? FormSchema);

public record ProjectResponse(
    Guid Id,
    string Name,
    string? Description,
    string FormSchema,
    DateTime CreatedAtUtc,
    DateTime? ArchivedAtUtc,
    int SurveyCount);
