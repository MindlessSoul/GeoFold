import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { ProjectResponse } from '../lib/types'

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setError(null)
    api<ProjectResponse[]>('/api/v1/projects')
      .then(setProjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load projects.'))
  }

  useEffect(load, [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await api<ProjectResponse>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || null, formSchema: '[]' }),
      })
      setName('')
      setDescription('')
      load()
    } catch (e) {
      // A quota rejection is a normal state, not a crash — show the plan message plainly.
      setError(e instanceof ApiError ? e.message : 'Failed to create project.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="row">
        <h1>Projects</h1>
      </div>

      <form onSubmit={create} className="card">
        <strong>New project</strong>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Description (optional)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" disabled={creating} style={{ marginTop: 14 }}>
          {creating ? 'Creating…' : 'Create project'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {projects === null && !error && <p className="muted">Loading…</p>}
      {projects?.length === 0 && <p className="muted">No projects yet. Create your first one above.</p>}

      {projects?.map((p) => (
        <div key={p.id} className="card row">
          <div>
            <Link to={`/projects/${p.id}`} style={{ fontWeight: 500 }}>
              {p.name}
            </Link>
            {p.description && <div className="muted" style={{ fontSize: 14 }}>{p.description}</div>}
          </div>
          <span className="badge">{p.surveyCount} surveys</span>
        </div>
      ))}
    </div>
  )
}
