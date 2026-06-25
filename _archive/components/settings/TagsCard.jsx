// DD-371 (T02/D04): Aus ProjectSettings.jsx herausgelöst nach src/components/settings/.
// Projektbezogen — Tags sind X-Project-Id-gescopet (/api/tags). Import sowohl in
// ProjectSettings (projektbezogen) als auch potenziell anderen Containern möglich.

import { useState, useEffect, useCallback } from 'react'
import { TAG_COLORS, TagChip } from '../TagMultiSelect.jsx'

export default function TagsCard() {
  const [tags, setTags] = useState([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('mauve')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: 'mauve' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    fetch('/api/tags').then(r => r.ok ? r.json() : []).then(d => setTags(Array.isArray(d) ? d : []))
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newColor }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Anlegen fehlgeschlagen')
      setNewName(''); setNewColor('mauve')
      load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const startEdit = (t) => { setEditingId(t.id); setEditForm({ name: t.name, color: t.color }); setErr('') }
  const cancelEdit = () => { setEditingId(null); setErr('') }
  const saveEdit = async () => {
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/tags/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Speichern fehlgeschlagen')
      setEditingId(null); load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const remove = async (t) => {
    if (!confirm(`Tag "${t.name}" wirklich löschen? (${t.usage_count} Zuweisungen)`)) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/tags/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl p-5 mb-4" data-ui="project-settings.tags" style={{ background: 'var(--mantle)' }}>
      <div className="flex items-baseline justify-between mb-1" data-ui="project-settings.tags.header">
        <h2 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>Tags</h2>
        <span className="text-xs" style={{ color: 'var(--overlay0)' }}>projekt-spezifisch · {tags.length} Tag(s)</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--overlay0)' }}>
        Tags ersetzen das alte Plugin-Key-Feld. Issues können mehrere Tags haben.
      </p>

      <div className="space-y-2 mb-3" data-ui="project-settings.tags.list">
        {tags.map(t => (
          <div key={t.id} className="rounded-lg p-2 flex items-center gap-2" data-ui={`project-settings.tags.item.${t.id}`} style={{ background: 'var(--base)' }}>
            {editingId === t.id ? (
              <>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="flex-1 rounded px-2 py-1 border-0 outline-none"
                  data-ui={`project-settings.tags.item.${t.id}.name-input`}
                  style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
                />
                <select
                  value={editForm.color}
                  onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                  className="rounded px-2 py-1 border-0 outline-none"
                  data-ui={`project-settings.tags.item.${t.id}.color-select`}
                  style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
                >
                  {TAG_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={saveEdit} disabled={busy} className="px-3 py-1 rounded text-xs font-medium text-white" data-ui={`project-settings.tags.item.${t.id}.save`} style={{ background: 'var(--accent-primary)' }}>OK</button>
                <button onClick={cancelEdit} className="px-3 py-1 rounded text-xs" data-ui={`project-settings.tags.item.${t.id}.cancel`} style={{ background: 'var(--surface1)', color: 'var(--text)' }}>×</button>
              </>
            ) : (
              <>
                <TagChip tag={t} />
                <span className="text-xs" style={{ color: 'var(--overlay0)' }}>{t.usage_count}× verwendet</span>
                <button onClick={() => startEdit(t)} className="ml-auto px-2 py-1 rounded text-xs" data-ui={`project-settings.tags.item.${t.id}.edit`} style={{ background: 'var(--surface1)', color: 'var(--text)' }}>Edit</button>
                <button onClick={() => remove(t)} disabled={busy} className="px-2 py-1 rounded text-xs" data-ui={`project-settings.tags.item.${t.id}.delete`} style={{ background: 'var(--surface1)', color: 'var(--red)' }}>Löschen</button>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--overlay0)' }}>Noch keine Tags angelegt.</p>
        )}
      </div>

      <div className="flex gap-2" data-ui="project-settings.tags.form">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
          placeholder="Neuer Tag-Name…"
          className="flex-1 rounded-lg px-3 py-2 border-0 outline-none"
          data-ui="project-settings.tags.form.name-input"
          style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '40px' }}
        />
        <select
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="rounded-lg px-2 py-2 border-0 outline-none"
          data-ui="project-settings.tags.form.color-select"
          style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
        >
          {TAG_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={create}
          disabled={busy || !newName.trim()}
          className="px-3 py-2 rounded-lg text-sm font-medium text-white"
          data-ui="project-settings.tags.form.add"
          style={{ background: 'var(--accent-success)', minHeight: '40px', opacity: (busy || !newName.trim()) ? 0.5 : 1 }}
        >
          + Tag
        </button>
      </div>

      {err && (
        <div className="rounded-lg p-2 mt-3 text-xs" style={{ background: 'var(--surface0)', color: 'var(--red)' }}>{err}</div>
      )}
    </div>
  )
}
