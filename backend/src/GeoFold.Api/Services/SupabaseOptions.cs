namespace GeoFold.Api.Services;

public class SupabaseOptions
{
    public const string SectionName = "Supabase";

    public string Url { get; set; } = default!;
    public string ServiceRoleKey { get; set; } = default!;
    public string StorageBucket { get; set; } = "survey-photos";
}
