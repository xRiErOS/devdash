// DD-371 (T02 / DD-348 D04): Schlanke Metadaten-Card für die Projekt-Settings.
// Kapselt das EDIT der bestehenden projects-Row via PUT /api/projects/:id.
// PO Q02: Projekt-ANLAGE bleibt im Quick-Switcher — diese Card editiert nur die
// bereits existierende Row, sie legt kein Projekt an.
//
// Editierbare Felder: name, description, color, storybook_url (DD-520), repo_path,
// docs_path, archived. Read-only: slug, prefix. context_file_path (CLAUDE.md) bleibt
// DB-Feld, hat aber kein Settings-Control mehr (D51 / Memory 237 — repo-only).
// Lädt das Projekt selbst (gescopet auf projectId) und hält die Save-/Reset-Logik
// lokal, damit ProjectSettings nur noch komponiert.

import { useState, useEffect, useCallback } from 'react'

const EMPTY_FORM = {
  name: '',
  description: '',
  color: '#cba6f7', // hex-ok: default-project-color (DB data)
  storybook_url: '',
  archived: false,
  repo_path: '',
  docs_path: '',
}

function toForm(data) {
  return {
    name: data.name || '',
    description: data.description || '',
    color: data.color || '#cba6f7', // hex-ok: default-project-color (DB data)
    storybook_url: data.storybook_url || '',
    archived: !!data.archived,
    repo_path: data.repo_path || '',
    docs_path: data.docs_path || '',
  }
}

export default function ProjectMetadataCard({ projectId, onLoaded }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError('')
    fetch(`/api/projects/${projectId}`)
      .then(r => {
        if (!r.ok) throw new Error('Projekt nicht gefunden')
        return r.json()
      })
      .then(data => {
        setProject(data)
        setForm(toForm(data))
        setLoading(false)
        onLoaded?.(data)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [projectId, onLoaded])

  useEffect(() => { load() }, [load])

  const dirty = project && (
    form.name !== (project.name || '') ||
    form.description !== (project.description || '') ||
    form.color !== (project.color || '#cba6f7') || // hex-ok: default-project-color (DB data)
    form.storybook_url !== (project.storybook_url || '') ||
    form.archived !== !!project.archived ||
    form.repo_path !== (project.repo_path || '') ||
    form.docs_path !== (project.docs_path || '')
  )

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        storybook_url: form.storybook_url.trim() || null,
        archived: form.archived ? 1 : 0,
        repo_path: form.repo_path.trim() || null,
        docs_path: form.docs_path.trim() || null,
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Fehler beim Speichern')
      }
      const updated = await res.json()
      setProject(updated)
      setForm(toForm(updated))
      setSavedAt(Date.now())
      onLoaded?.(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (!project) return
    setForm(toForm(project))
    setError('')
  }

  if (loading) return <p className="text-center py-12" style={{ color: 'var(--subtext0)' }}>Laden...</p>
  if (!project) return <p className="text-center py-12" style={{ color: 'var(--red)' }}>{error || 'Projekt nicht gefunden'}</p>

  return (
    <>
      <div data-ui="project-settings.metadata.stammdaten" className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Stammdaten</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Slug (read-only)
              </label>
              <input
                data-ui="project-settings.metadata.stammdaten.slug"
                type="text"
                value={project.slug}
                readOnly
                className="w-full rounded-lg px-3 py-2 border-0 outline-none font-mono"
                style={{ background: 'var(--surface0)', color: 'var(--overlay0)', fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Prefix (read-only)
              </label>
              <input
                data-ui="project-settings.metadata.stammdaten.prefix"
                type="text"
                value={project.prefix || ''}
                readOnly
                className="w-full rounded-lg px-3 py-2 border-0 outline-none font-mono"
                style={{ background: 'var(--surface0)', color: 'var(--overlay0)', fontSize: '16px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Anzeigename *
            </label>
            <input
              data-ui="project-settings.metadata.stammdaten.name"
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Beschreibung
            </label>
            <textarea
              data-ui="project-settings.metadata.stammdaten.description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '80px' }}
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Storybook-URL
              </label>
              <input
                data-ui="project-settings.metadata.stammdaten.storybook-url"
                type="url"
                value={form.storybook_url}
                onChange={e => setForm(f => ({ ...f, storybook_url: e.target.value }))}
                placeholder="http://mac-mini-von-erik.tail969074.ts.net:6006"
                className="w-full rounded-lg px-3 py-2 border-0 outline-none font-mono"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Farbe
              </label>
              <input
                data-ui="project-settings.metadata.stammdaten.color"
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-12 h-10 rounded cursor-pointer"
                style={{ background: 'var(--surface0)' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div data-ui="project-settings.metadata.directories" className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-1" style={{ color: 'var(--subtext0)' }}>Verzeichnisse</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--overlay0)' }}>
          Pfade fürs Auto-Complete in „Relevant Files“.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Repository-Pfad
            </label>
            <input
              data-ui="project-settings.metadata.directories.repo-path"
              type="text"
              value={form.repo_path}
              onChange={e => setForm(f => ({ ...f, repo_path: e.target.value }))}
              placeholder="/Users/.../mein-projekt"
              className="w-full rounded-lg px-3 py-2 border-0 outline-none font-mono"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--overlay0)' }}>
              Quelle fürs Auto-Complete der Relevant-Files-Chips.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Docs-Pfad (optional)
            </label>
            <input
              data-ui="project-settings.metadata.directories.docs-path"
              type="text"
              value={form.docs_path}
              onChange={e => setForm(f => ({ ...f, docs_path: e.target.value }))}
              placeholder="/Users/.../Obsidian/Vault/.../Projekt-Docs"
              className="w-full rounded-lg px-3 py-2 border-0 outline-none font-mono"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--overlay0)' }}>
              Zusätzliches Verzeichnis (z.B. Obsidian-Vault). Dateien erscheinen ebenfalls im Auto-Complete.
            </p>
          </div>
        </div>
      </div>

      <div data-ui="project-settings.metadata.archiving" className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Archivierung</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            data-ui="project-settings.metadata.archiving.toggle"
            type="checkbox"
            checked={form.archived}
            onChange={e => setForm(f => ({ ...f, archived: e.target.checked }))}
            className="w-5 h-5"
          />
          <div>
            <div className="text-sm font-medium">Projekt archivieren</div>
            <div className="text-xs" style={{ color: 'var(--subtext0)' }}>
              Archivierte Projekte sind im Project-Switcher ausgeblendet, ihre Daten bleiben erhalten.
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: 'var(--surface0)', color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 sticky bottom-0 pt-3 pb-safe bg-[var(--base)]">
        <button
          data-ui="project-settings.metadata.save"
          onClick={save}
          disabled={!dirty || saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{
            background: 'var(--accent-primary)',
            minHeight: '40px',
            opacity: (!dirty || saving || !form.name.trim()) ? 0.5 : 1,
          }}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
        <button
          data-ui="project-settings.metadata.reset"
          onClick={reset}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: 'var(--surface1)',
            color: 'var(--text)',
            minHeight: '40px',
            opacity: (!dirty || saving) ? 0.5 : 1,
          }}
        >
          Verwerfen
        </button>
        {savedAt > 0 && !dirty && (
          <span className="text-xs ml-2" style={{ color: 'var(--green)' }}>
            Gespeichert
          </span>
        )}
      </div>
    </>
  )
}
