import { useState } from 'react'
import { Play, CheckCircle2, X as XIcon, RotateCcw } from 'lucide-react'
import Tooltip from './ui/atoms/Tooltip.jsx'
import Modal from './ui/molecules/Modal.jsx'

// DD-162: Sprint-Action-Buttons im Sprint-Header.
// Idempotenz aus DD-158: Doppelklick auf z.B. Review→Review wirft kein 422.
//
// DD-166: "An Review übergeben" entfernt (passiert ausschliesslich auf der
// Review-Page). Start + Cancel sind kompakte Icon-only-Buttons.
//
// DD-451: beide Dialoge auf zentrales ui/Modal migriert. busy-Guard via Modal-Prop
// (blockt ESC + Backdrop-Close während laufendem Submit).
//
// Buttons je nach sprint.status:
//   planning  → [▶]
//   active    → [✕]
//   review    → [Complete] [Re-Work] [✕]
//   completed/cancelled → keine Buttons
function CancelDialog({ open, onClose, onConfirm, busy }) {
  const [notes, setNotes] = useState('')
  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={busy}
        className="px-3 py-1.5 rounded-lg text-sm bg-[var(--surface0)] text-[var(--subtext1)]"
        data-ui="sprint-actions.cancel-dialog.back">
        Zurück
      </button>
      <button type="submit" form="sprint-cancel-form" disabled={!notes.trim() || busy}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 bg-[var(--red)] text-[var(--on-accent)]"
        data-ui="sprint-actions.cancel-dialog.confirm">
        {busy ? 'Abbreche…' : 'Abbrechen'}
      </button>
    </>
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Sprint abbrechen"
      size="sm"
      footer={footer}
      backdropDataUi="sprint-actions.cancel-dialog"
    >
      <form
        id="sprint-cancel-form"
        onSubmit={(e) => { e.preventDefault(); if (notes.trim()) onConfirm(notes.trim()) }}
        data-ui="sprint-actions.cancel-dialog.form"
      >
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wide text-[var(--hint)]">Begründung *</span>
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg outline-none border-0 resize-none text-base bg-[var(--surface0)] text-[var(--text)]"
            data-ui="sprint-actions.cancel-dialog.notes"
          />
        </label>
      </form>
    </Modal>
  )
}

function CompleteDialog({ open, onClose, onConfirm, openItems, blockingResults = [], busy }) {
  const [force, setForce] = useState(false)
  const blocked = openItems.length > 0
  // DD-360: passed/done-Issues ohne result blocken den Abschluss (Backend-422).
  // Diese Liste kommt aus der 422-Response — force hilft hier NICHT (result ist Pflicht).
  const missingResult = blockingResults.length > 0
  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={busy}
        className="px-3 py-1.5 rounded-lg text-sm bg-[var(--surface0)] text-[var(--subtext1)]"
        data-ui="sprint-actions.complete-dialog.back">
        Zurück
      </button>
      <button type="button" onClick={() => onConfirm(force)} disabled={busy || (blocked && !force) || missingResult}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 bg-[var(--green)] text-[var(--on-accent)]"
        data-ui="sprint-actions.complete-dialog.confirm">
        {busy ? 'Schließe…' : missingResult ? 'result fehlt' : blocked ? 'Force completen' : 'Abschließen'}
      </button>
    </>
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Sprint abschließen"
      size="sm"
      footer={footer}
      backdropDataUi="sprint-actions.complete-dialog"
      dialogDataUi="sprint-actions.complete-dialog.panel"
    >
      <div className="text-sm space-y-2">
        {blocked ? (
          <>
            <p className="text-[var(--text)]">Nicht-passed Items vorhanden:</p>
            <ul className="text-xs font-mono space-y-0.5 text-[var(--subtext1)]">
              {openItems.slice(0, 6).map(it => (
                <li key={it.id} data-ui={`sprint-actions.complete-dialog.open-item.${it.id}`}>· {it.key} [{it.status}]{it.review ? ` review=${it.review}` : ''}</li>
              ))}
              {openItems.length > 6 && <li>… und {openItems.length - 6} weitere</li>}
            </ul>
            <label className="flex items-center gap-2 mt-3 text-xs text-[var(--peach)]">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} data-ui="sprint-actions.complete-dialog.force" />
              Trotzdem abschließen (force) — wird im Audit-Log markiert
            </label>
          </>
        ) : missingResult ? (
          <>
            <p className="text-[var(--red)]">result fehlt — diese Issues müssen ein result haben, bevor der Sprint abgeschlossen werden kann:</p>
            <ul className="text-xs font-mono space-y-0.5 text-[var(--subtext1)]">
              {blockingResults.slice(0, 8).map(it => (
                <li key={it.id} data-ui={`sprint-actions.complete-dialog.blocking-result.${it.id}`}>· {it.key} — {it.title} [{it.status}]</li>
              ))}
              {blockingResults.length > 8 && <li>… und {blockingResults.length - 8} weitere</li>}
            </ul>
            <p className="text-xs mt-1 text-[var(--subtext0)]">
              result via <code className="px-1 rounded-[3px] bg-[var(--surface1)]">devd-cli issue set-result &lt;key&gt;</code> nachtragen, dann erneut abschließen.
            </p>
          </>
        ) : (
          <p className="text-[var(--text)]">Alle Items sind passed. Sprint wird auf completed gesetzt, alle passed-Items auf done.</p>
        )}
      </div>
    </Modal>
  )
}

export default function SprintActions({ sprint, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [openItems, setOpenItems] = useState([])
  // DD-360: passed/done-Issues ohne result aus der 422-Response (Block-Liste).
  const [blockingResults, setBlockingResults] = useState([])

  // DD-166 R2: Fehler ueber globalen Toast statt inline — kompakte Toolbar-
  // Integration laesst keinen Platz fuer eine zusaetzliche Inline-Errorbox.
  const emitToast = (message, kind = 'error') => {
    window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message, kind } }))
  }

  const transition = async (to) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || `HTTP ${res.status}`)
      onChanged?.()
    } catch (e) { emitToast(`Sprint-Aktion fehlgeschlagen: ${e.message}`) }
    finally { setBusy(false) }
  }

  const submitCancel = async (notes) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'cancelled', cancellationNotes: notes }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || `HTTP ${res.status}`)
      setCancelOpen(false)
      onChanged?.()
    } catch (e) { emitToast(`Sprint-Abbruch fehlgeschlagen: ${e.message}`) }
    finally { setBusy(false) }
  }

  const openComplete = async () => {
    setBusy(true)
    setBlockingResults([])
    try {
      const res = await fetch(`/api/sprints/${sprint.id}`)
      const data = await res.json()
      const items = (data.items || [])
        .filter(it => it.status !== 'cancelled')
        .filter(it => it.status !== 'passed' && it.status !== 'done')
        .map(it => ({
          id: it.id,
          key: it.project_prefix && it.project_number != null
            ? `${it.project_prefix}-${it.project_number}` : `#${it.id}`,
          status: it.status,
          review: it.review_status,
        }))
      setOpenItems(items)
      setCompleteOpen(true)
    } catch { /* Fehler via Toast, kein Inline-State */ }
    finally { setBusy(false) }
  }

  const submitComplete = async (force) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        // DD-360: 422 mit blockierenden result-losen Issues → Liste im Dialog
        // anzeigen (Dialog offen lassen), statt nur den Fehlertext zu verwerfen.
        if (res.status === 422 && Array.isArray(body.issues) && body.issues.length > 0) {
          setBlockingResults(body.issues)
          emitToast(body.error || 'Sprint-Abschluss blockiert: result fehlt', 'error')
          return
        }
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setCompleteOpen(false)
      onChanged?.()
    } catch (e) { emitToast(`Sprint-Abschluss fehlgeschlagen: ${e.message}`) }
    finally { setBusy(false) }
  }

  const status = sprint.status
  const isTerminal = status === 'completed' || status === 'cancelled' || status === 'closed'
  if (isTerminal) return null

  // DD-166 R2/R3: alle Sprint-Lifecycle-Aktionen als gleichgrosse Icon-only-
  // Buttons mit Custom-Tooltip. Kein native title (-> kein Doppel-Tooltip);
  // aria-label bleibt fuer Screen-Reader.
  const IconBtn = ({ onClick, title, colorClass, Icon, slug }) => (
    <Tooltip label={title}>
      <button
        onClick={onClick}
        disabled={busy}
        className={`w-7 h-7 min-h-[28px] rounded flex items-center justify-center disabled:opacity-50 bg-[var(--surface1)] ${colorClass}`}
        aria-label={title}
        data-ui={slug}
      >
        <Icon size={14} />
      </button>
    </Tooltip>
  )

  return (
    <>
      {status === 'planning' && (
        <IconBtn onClick={() => transition('active')} title="Sprint starten"
          colorClass="text-[var(--green)]" Icon={Play} slug="sprint-actions.toolbar.start" />
      )}
      {status === 'active' && (
        <IconBtn onClick={() => setCancelOpen(true)} title="Sprint abbrechen (Begründung erforderlich)"
          colorClass="text-[var(--red)]" Icon={XIcon} slug="sprint-actions.toolbar.cancel" />
      )}
      {status === 'review' && (
        <>
          <IconBtn onClick={openComplete} title="Sprint abschließen (review → completed)"
            colorClass="text-[var(--green)]" Icon={CheckCircle2} slug="sprint-actions.toolbar.complete" />
          <IconBtn onClick={() => transition('active')} title="Sprint zurück zu active (Re-Work)"
            colorClass="text-[var(--peach)]" Icon={RotateCcw} slug="sprint-actions.toolbar.rework" />
          <IconBtn onClick={() => setCancelOpen(true)} title="Sprint abbrechen (Begründung erforderlich)"
            colorClass="text-[var(--red)]" Icon={XIcon} slug="sprint-actions.toolbar.cancel" />
        </>
      )}
      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={submitCancel} busy={busy} />
      <CompleteDialog open={completeOpen} onClose={() => setCompleteOpen(false)}
        onConfirm={submitComplete} openItems={openItems} blockingResults={blockingResults} busy={busy} />
    </>
  )
}
