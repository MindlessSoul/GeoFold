namespace GeoFold.Api.Models;

public class Project
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Profile User { get; set; } = default!;

    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    // jsonb: field definitions [{ key, label, type, required }, ...] that survey form_data is validated against.
    public string FormSchema { get; set; } = "[]";

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ArchivedAtUtc { get; set; }

    public ICollection<Survey> Surveys { get; set; } = new List<Survey>();
}
