import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
      setError(e instanceof ApiError ? e.message : 'Failed to create project.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Projects</h1>
        <p>Each project is a separate survey — its own points, photos and form.</p>
      </div>

      <div className="card">
        <div className="card-title">New project</div>
        <form onSubmit={create}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sekadau" required />
          <label>Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={creating} style={{ marginTop: 16 }}>
            <Plus size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      {projects === null && !error && <p className="muted">Loading…</p>}
      {projects?.length === 0 && <div className="empty">No projects yet. Create your first one above.</div>}

      {projects?.map((p) => (
        <Link key={p.id} to={`/projects/${p.id}`} className="list-row">
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
            {p.description && <div className="hint">{p.description}</div>}
          </div>
          <span className="badge accent">{p.surveyCount} surveys</span>
        </Link>
      ))}
    </div>
  )
}
