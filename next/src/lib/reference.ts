import type { SurveyDetail } from './types'

// A short, readable code from a project name: "Kampung Durian" -> "KAMPUNG-DURIAN".
export function slugifyProject(name: string): string {
  const s = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
  return s || 'PROJECT'
}

// Stable, human-readable reference per survey: <PROJECT-SLUG>-NNN, numbered by
// capture order within each project (oldest = 001). Used in Records and exports
// instead of the long UUID.
export function buildReferences(
  surveys: SurveyDetail[],
  projectName: (id: string) => string,
): Map<string, string> {
  const byProject = new Map<string, SurveyDetail[]>()
  for (const s of surveys) {
    const arr = byProject.get(s.projectId) ?? []
    arr.push(s)
    byProject.set(s.projectId, arr)
  }
  const refs = new Map<string, string>()
  for (const [pid, arr] of byProject) {
    const slug = slugifyProject(projectName(pid))
    ;[...arr]
      .sort((a, b) => a.capturedAtUtc.localeCompare(b.capturedAtUtc))
      .forEach((s, i) => refs.set(s.id, `${slug}-${String(i + 1).padStart(3, '0')}`))
  }
  return refs
}
