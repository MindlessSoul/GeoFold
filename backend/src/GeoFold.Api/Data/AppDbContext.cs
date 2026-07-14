using GeoFold.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Survey> Surveys => Set<Survey>();
    public DbSet<SurveyPhoto> SurveyPhotos => Set<SurveyPhoto>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");

        modelBuilder.Entity<Profile>(e =>
        {
            e.ToTable("profiles");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).ValueGeneratedNever(); // set from Supabase auth.users.id
            e.Property(p => p.CreatedAtUtc).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Subscription>(e =>
        {
            e.ToTable("subscriptions");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
            e.HasOne(s => s.User)
                .WithOne(p => p.Subscription)
                .HasForeignKey<Subscription>(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(s => s.UserId).IsUnique();
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(p => p.CreatedAtUtc).HasDefaultValueSql("now()");
            e.Property(p => p.FormSchema).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.HasOne(p => p.User)
                .WithMany(u => u.Projects)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(p => p.UserId);
        });

        modelBuilder.Entity<Survey>(e =>
        {
            e.ToTable("surveys");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedNever(); // client-generated for idempotent sync
            e.Property(s => s.Location).HasColumnType("geography (point)");
            e.Property(s => s.Details).HasColumnType("jsonb");
            e.Property(s => s.SyncedAtUtc).HasDefaultValueSql("now()");

            e.HasOne(s => s.Project)
                .WithMany(p => p.Surveys)
                .HasForeignKey(s => s.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(s => s.User)
                .WithMany(u => u.Surveys)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(s => s.ProjectId);
            e.HasIndex(s => s.UserId);
            e.HasIndex(s => s.Location).HasMethod("GIST");
        });

        modelBuilder.Entity<SurveyPhoto>(e =>
        {
            e.ToTable("survey_photos");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).ValueGeneratedNever(); // client-generated
            e.Property(p => p.Location).HasColumnType("geography (point)");

            e.HasOne(p => p.Survey)
                .WithMany(s => s.Photos)
                .HasForeignKey(p => p.SurveyId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(p => p.SurveyId);
        });
    }
}
