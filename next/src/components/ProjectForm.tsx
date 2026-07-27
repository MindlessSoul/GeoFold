'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import type { FormField, ProjectResponse } from '@/lib/types'

const FIELD_TYPES = ['text', 'number', 'integer', 'date', 'boolean'] as const
interface FieldRow { label: string; type: string; required: boolean }

const slug = (l: string) => l.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

function toSchema(rows: FieldRow[]): FormField[] {
  const seen = new Map<string, number>()
  return rows.filter((r) => r.label.trim()).map((r) => {
    let key = slug(r.label) || 'field'
    const n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    if (n > 0) key = `${key}_${n + 1}`
    return { key, label: r.label.trim(), type: r.type, required: r.required }
  })
}

export function ProjectForm({ projectId }: { projectId?: string }) {
  const editing = Boolean(projectId)
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<FieldRow[]>([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    api<ProjectResponse>(`/api/projects/${projectId}`)
      .then((p) => {
        setName(p.name)
        setDescription(p.description ?? '')
        try {
          const fields: FormField[] = JSON.parse(p.formSchema)
          if (Array.isArray(fields)) setRows(fields.map((f) => ({ label: f.label ?? f.key, type: f.type, required: Boolean(f.required) })))
        } catch { /* leave empty */ }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project.'))
      .finally(() => setLoading(false))
  }, [editing, projectId])

  const schemaPreview = useMemo(() => toSchema(rows), [rows])
  const addRow = () => setRows((r) => [...r, { label: '', type: 'text', required: false }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<FieldRow>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      const body = JSON.stringify({ name, description: description || null, formSchema: JSON.stringify(schemaPreview) })
      if (editing) {
        await api(`/api/projects/${projectId}`, { method: 'PUT', body })
        router.push(`/projects/${projectId}`)
      } else {
        const created = await api<ProjectResponse>('/api/projects', { method: 'POST', body })
        router.push(`/projects/${created.id}`)
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save project.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="page-head">
        <h1>{editing ? 'Edit project' : 'New project'}</h1>
        <p>A project groups surveys and defines the form filled in at each point.</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sekadau" />
        <label>Description (optional)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 4 }}>
          <div className="card-title" style={{ margin: 0 }}>Survey form fields</div>
          <button type="button" className="ghost" onClick={addRow} style={{ padding: '7px 12px' }}>
            <Plus size={15} style={{ verticalAlign: -3, marginRight: 5 }} /> Add field
          </button>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>These are the questions a surveyor answers at each point.</p>
        {rows.length === 0 && <div className="empty">No fields yet. Add one so surveys can be described.</div>}
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 116px auto 32px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <GripVertical size={16} style={{ color: 'var(--ink-3)' }} />
            <input value={row.label} onChange={(e) => updateRow(i, { label: e.target.value })} placeholder="Field label (e.g. Condition)" />
            <select value={row.type} onChange={(e) => updateRow(i, { type: e.target.value })}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={row.required} onChange={(e) => updateRow(i, { required: e.target.checked })} style={{ width: 'auto' }} /> required
            </label>
            <button type="button" className="ghost" onClick={() => removeRow(i)} aria-label="Remove field" style={{ padding: 6, border: 'none' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}</button>
        <button type="button" className="ghost" onClick={() => router.back()}>Cancel</button>
      </div>
    </div>
  )
}
