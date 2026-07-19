import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import type { FormField, ProjectResponse } from '../lib/types'

function parseSchema(json: string): FormField[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<ProjectResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<ProjectResponse>(`/api/v1/projects/${id}`)
      .then(setProject)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project.'))
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!project) return <p className="muted">Loading…</p>

  const fields = parseSchema(project.formSchema)

  return (
    <div>
      <Link to="/projects" className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> Projects
      </Link>

      <div className="page-head" style={{ marginTop: 10 }}>
        <div className="row">
          <h1>{project.name}</h1>
          <span className="badge accent">{project.surveyCount} surveys</span>
        </div>
        {project.description && <p>{project.description}</p>}
      </div>

      <div className="card">
        <div className="card-title">Survey form</div>
        {fields.length === 0 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            No fields defined yet. These are the questions a surveyor fills in at each point.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-3)', fontSize: 12 }}>
                <th style={{ padding: '6px 0', fontWeight: 500 }}>Field</th>
                <th style={{ fontWeight: 500 }}>Label</th>
                <th style={{ fontWeight: 500 }}>Type</th>
                <th style={{ fontWeight: 500 }}>Required</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 0', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{f.key}</td>
                  <td>{f.label ?? '—'}</td>
                  <td className="muted">{f.type}</td>
                  <td>{f.required ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
