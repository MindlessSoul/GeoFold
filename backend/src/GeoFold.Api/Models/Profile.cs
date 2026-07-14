namespace GeoFold.Api.Models;

public class Profile
{
    public Guid Id { get; set; } // matches Supabase auth.users.id
    public string? DisplayName { get; set; }
    public string Role { get; set; } = "surveyor"; // surveyor | admin
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<Survey> Surveys { get; set; } = new List<Survey>();
    public Subscription? Subscription { get; set; }
}
