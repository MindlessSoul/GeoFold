using GeoFold.Api.Authorization;
using GeoFold.Api.Data;
using GeoFold.Api.DTOs;
using GeoFold.Api.Models;
using GeoFold.Api.Quota;
using GeoFold.Api.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoFold.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/projects")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IQuotaService _quota;

    public ProjectsController(AppDbContext db, IQuotaService quota)
    {
        _db = db;
        _quota = quota;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectResponse>>> List(CancellationToken ct)
    {
        var userId = User.GetUserId();

        var projects = await _db.Projects
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.ArchivedAtUtc == null)
            .OrderByDescending(p => p.CreatedAtUtc)
            .Select(p => new ProjectResponse(
                p.Id, p.Name, p.Description, p.FormSchema, p.CreatedAtUtc, p.ArchivedAtUtc,
                p.Surveys.Count))
            .ToListAsync(ct);

        return Ok(projects);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectResponse>> Create(CreateProjectRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();

        // Reject a malformed form_schema up front so surveys can be validated against it later.
        var formSchema = string.IsNullOrWhiteSpace(request.FormSchema) ? "[]" : request.FormSchema;
        FormSchemaValidator.ParseSchema(formSchema, out var schemaErrors);
        if (schemaErrors.Count > 0)
            return BadRequest(new { error = "invalid_form_schema", errors = schemaErrors });

        var quota = await _quota.CheckProjectCreationAsync(userId, ct);
        if (!quota.Allowed)
            return QuotaResults.QuotaExceeded(quota.Message);

        var project = new Project
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            FormSchema = formSchema,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = project.Id },
            new ProjectResponse(project.Id, project.Name, project.Description, project.FormSchema,
                project.CreatedAtUtc, null, 0));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectResponse>> Get(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId();

        var project = await _db.Projects
            .AsNoTracking()
            .Where(p => p.Id == id && p.UserId == userId)
            .Select(p => new ProjectResponse(
                p.Id, p.Name, p.Description, p.FormSchema, p.CreatedAtUtc, p.ArchivedAtUtc, p.Surveys.Count))
            .FirstOrDefaultAsync(ct);

        return project is null ? NotFound() : Ok(project);
    }
}
