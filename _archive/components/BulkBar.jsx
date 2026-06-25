import { useState, useEffect } from 'react'
import { X, Trash2, ChevronDown, ArrowRight } from 'lucide-react'
import { sprintLabel } from '../lib/sprintLabel.js'
import { getActiveProjectId } from '../lib/projectStore.js'

const STATUSES = [
  { value: 'refined', label: 'Refined' },
  { value: 'planned', label: 'Geplant' },
  { value: 'cancelled', label: 'Storniert' },
]

/**
 * BulkBar — DD-36. Floating Action-Bar fuer Bulk-Operationen auf
 * mehrfach selektierten Issues. Unterstuetzt:
 *  - Sprint zuweisen / entfernen
 *  - Status setzen
 *  - In Papierkorb verschieben
 */
export default function BulkBar({ selectedIds, sprints, onClear, onResult }) {
  const [busy, setBusy] = useState(false)
  const [openMenu, setOpenMenu] = useState(null) // 'sprint' | 'status' | 'move' | null
  // DD-113 R2: Liste anderer Projekte für Move-Menü.
  const [projects, setProjects] = useState([])
  const currentProjectId = getActiveProjectId()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpenMenu(null); onClear() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClear])

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then(list => { if (!cancelled) setProjects(Array.isArray(list) ? list : []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const count = selectedIds.length

  const callBulk = async (action, payload) => {
    setBusy(true)
    setOpenMenu(null)
    try {
      const res = await fetch('/api/backlog/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, payload }),
      })
      const data = await res.json()
      onResult?.(data)
    } catch (e) {
      onResult?.({ ok: [], failed: selectedIds.map(id => ({ id, reason: e.message })) })
    } finally {
      setBusy(false)
    }
  }

  const confirmDestructive = (action, payload, label) => {
    if (count > 5 && !confirm(`${label} auf ${count} Items?`)) return
    callBulk(action, payload)
  }

  // DD-113 R2: Bulk-Move per /api/backlog/:id/move. Loop, da kein Bulk-Endpoint.
  const moveToProject = async (target) => {
    if (!confirm(`${count} Issue(s) in Projekt "${target.name}" verschieben? Sprint-Zuordnung wird entfernt.`)) return
    setBusy(true); setOpenMenu(null)
    const ok = []
    const failed = []
    await Promise.all(selectedIds.map(async (id) => {
      try {
        const res = await fetch(`/api/backlog/${id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_project_id: target.id }),
        })
        if (res.ok) ok.push(id)
        else {
          const err = await res.json().catch(() => ({}))
          failed.push({ id, reason: err.error || `HTTP ${res.status}` })
        }
      } catch (e) {
        failed.push({ id, reason: e.message })
      }
    }))
    setBusy(false)
    onResult?.({ ok, failed })
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-xl shadow-2xl"
      style={{
        background: 'var(--mantle)',
        border: '1px solid var(--surface1)',
        maxWidth: 'calc(100vw - 2rem)',
      }}
      role="toolbar"
      aria-label="Bulk-Aktionen"
    >
      {/* DD-174 R2: Header-Zeile bleibt IMMER eine Zeile — Counter links, X rechts.
          Action-Buttons ziehen drunter ein und duerfen kontrolliert umbrechen. */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
        <span
          className="text-sm font-mono whitespace-nowrap shrink-0"
          style={{ color: 'var(--text)' }}
        >
          {count} ausgewählt
        </span>
        <div className="flex-1" aria-hidden />
        <button
          onClick={onClear}
          aria-label="Auswahl aufheben (Esc)"
          className="flex items-center justify-center rounded-lg shrink-0 hover:bg-[var(--surface0)]"
          style={{ width: '28px', height: '28px', color: 'var(--subtext0)' }}
        >
          <X size={16} />
        </button>
      </div>
      <div className="h-px mx-3 shrink-0" style={{ background: 'var(--surface1)' }} aria-hidden />
      {/* Action-Zone: kontrollierter Umbruch (>=1 Zeile je nach Viewport). */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2 pb-2">

      {/* Sprint */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(m => m === 'sprint' ? null : 'sprint')}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
          style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
        >
          Sprint <ChevronDown size={14} />
        </button>
        {openMenu === 'sprint' && (
          <div
            className="absolute bottom-full mb-1 left-0 w-56 rounded-lg shadow-2xl overflow-hidden border max-h-72 overflow-y-auto"
            style={{ background: 'var(--mantle)', borderColor: 'var(--surface1)' }}
          >
            <button
              onClick={() => callBulk('set_sprint', { sprint_id: null })}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface0)]"
              style={{ color: 'var(--text)' }}
            >
              Backlog
            </button>
            {sprints.filter(s => s.status === 'planning' || s.status === 'active').map(s => (
              <button
                key={s.id}
                onClick={() => callBulk('set_sprint', { sprint_id: s.id })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface0)]"
                style={{ color: 'var(--text)' }}
              >
                {sprintLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(m => m === 'status' ? null : 'status')}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
          style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
        >
          Status <ChevronDown size={14} />
        </button>
        {openMenu === 'status' && (
          <div
            className="absolute bottom-full mb-1 left-0 w-44 rounded-lg shadow-2xl overflow-hidden border"
            style={{ background: 'var(--mantle)', borderColor: 'var(--surface1)' }}
          >
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => callBulk('set_status', { status: s.value })}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface0)]"
                style={{ color: 'var(--text)' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DD-113 R2: In anderes Projekt verschieben */}
      {projects.filter(p => p.id !== currentProjectId && !p.archived).length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpenMenu(m => m === 'move' ? null : 'move')}
            disabled={busy}
            title="In anderes Projekt verschieben"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
            style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
          >
            <ArrowRight size={14} />
            Projekt <ChevronDown size={14} />
          </button>
          {openMenu === 'move' && (
            <div
              className="absolute bottom-full mb-1 left-0 w-56 rounded-lg shadow-2xl overflow-hidden border max-h-72 overflow-y-auto"
              style={{ background: 'var(--mantle)', borderColor: 'var(--surface1)' }}
            >
              {projects.filter(p => p.id !== currentProjectId && !p.archived).map(p => (
                <button
                  key={p.id}
                  onClick={() => moveToProject(p)}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-[var(--surface0)]"
                  style={{ color: 'var(--text)' }}
                >
                  <span className="font-mono text-[11px]" style={{ color: 'var(--hint)' }}>{p.prefix}</span>
                  <span className="flex-1 min-w-0 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DD-525: Stornieren (löst „Papierkorb"/Soft-Delete ab) */}
      <button
        onClick={() => confirmDestructive('cancel', {}, 'Stornieren')}
        disabled={busy}
        title="Ausgewählte Issues stornieren"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 min-h-[36px] bg-[var(--surface1)] text-[var(--accent-danger)]"
      >
        <Trash2 size={14} />
        Stornieren
      </button>
      </div>
    </div>
  )
}
