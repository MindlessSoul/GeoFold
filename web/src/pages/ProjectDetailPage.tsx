import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
      <p><Link to="/projects">← Projects</Link></p>
      <div className="row">
        <h1>{project.name}</h1>
        <span className="badge">{project.surveyCount} surveys</span>
      </div>
      {project.description && <p className="muted">{project.description}</p>}

      <div className="card">
        <strong>Form schema</strong>
        {fields.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>No fields defined for this project's survey form.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                <th style={{ padding: '6px 0' }}>Key</th>
                <th>Label</th>
                <th>Type</th>
                <th>Required</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{f.key}</td>
                  <td>{f.label ?? '—'}</td>
                  <td>{f.type}</td>
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
