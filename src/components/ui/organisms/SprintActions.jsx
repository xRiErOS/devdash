import { useState } from 'react'
import { Play, CheckCircle2, X as XIcon, RotateCcw } from 'lucide-react'
import Tooltip from '../atoms/Tooltip.jsx'
import Button from '../atoms/Button.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Modal from '../molecules/Modal.jsx'

/**
 * SprintActions — Organism (harvest aus components/SprintActions.jsx, DD-162/166/451).
 * Sprint-Lifecycle-Aktionsgruppe: kompakte Icon-only-Toolbar (start / complete / re-work /
 * cancel / reopen) gescoped auf `sprint.status`, plus zwei Bestätigungs-Dialoge (Cancel mit
 * Begründungs-Pflicht, Complete mit Open-Item- bzw. result-fehlt-Guard). Domänen-bewusst
 * (kennt einen Sprint und seine Lifecycle-Transitionen).
 *
 * Komponiert: Tooltip (Atom), Button (Dialog-Footer-Aktionen), Textarea (Cancel-Begründung),
 * Modal (Molecule, beide Dialoge).
 *
 * GEHOBENE KOPPLUNG (presentational, D-Phase3-01):
 * - `fetch PATCH /api/sprints/:id/status` (transition: active/cancelled) ENTFERNT →
 *   `onTransition(to)` bzw. `onCancel(notes)` Callback-Props. Der Screen führt die Mutation
 *   aus und reicht den neuen Sprint-Status als Prop zurück.
 * - `fetch GET /api/sprints/:id` (Open-Item-Lookup für den Complete-Dialog) ENTFERNT →
 *   `openItems` ist Prop (Screen lädt + mappt die nicht-passed-Items), `onRequestComplete()`
 *   öffnet den Dialog und triggert den Lookup screenseitig.
 * - `fetch POST /api/sprints/:id/complete` (+ 422-Handling für result-lose Issues) ENTFERNT →
 *   `onComplete(force)`-Callback; `blockingResults` (aus der 422-Response) ist Prop.
 * - `window.dispatchEvent('devd-toast')` ENTFERNT → Fehler-Toasts macht der Screen.
 * - `busy`-Guard ist Prop (Screen setzt ihn während laufendem Submit).
 * Lokaler EPHEMERER UI-State BLEIBT: Dialog-open-Flags, force-Checkbox, Cancel-Notes-Draft.
 *
 * @param {object} props
 * @param {object} props.sprint - Sprint-Datensatz (mind. `status`).
 * @param {boolean} [props.busy=false] - blockt Buttons + Dialog-Close während Submit.
 * @param {Array<{id:number,key:string,status:string,review?:string}>} [props.openItems=[]] -
 *   nicht-passed Items, die den Complete blocken (vom Screen vorgeladen/gemappt).
 * @param {Array<{id:number,key:string,title:string,status:string}>} [props.blockingResults=[]] -
 *   passed/done-Issues ohne result (aus der 422-Response des Complete-Calls).
 * @param {(to:string) => void} [props.onTransition] - Lifecycle-Transition (active / re-work / reopen → planning, DD-550).
 * @param {(notes:string) => void} [props.onCancel] - Cancel mit Begründung.
 * @param {() => void} [props.onRequestComplete] - öffnet den Complete-Dialog (Screen lädt openItems).
 * @param {(force:boolean) => void} [props.onComplete] - Sprint abschließen (optional force).
 * @param {string} [props.dataUiScope='sprint-actions'] - Wurzel-data-ui-Bereich (I03/D01,
 *   vom Screen umbiegbar auf z.B. 'sprint-detail').
 */
const TOOLBAR_BTN =
  'w-7 h-7 min-h-[28px] rounded flex items-center justify-center disabled:opacity-50 bg-[var(--surface1)]'

function ToolbarButton({ onClick, title, colorClass, Icon, dataUi, busy }) {
  return (
    <Tooltip label={title}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`${TOOLBAR_BTN} ${colorClass}`}
        aria-label={title}
        data-ui={dataUi}
      >
        <Icon size={14} />
      </button>
    </Tooltip>
  )
}

function CancelDialog({ open, onClose, onConfirm, busy, scope }) {
  const [notes, setNotes] = useState('')
  const footer = (
    <>
      <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}
        data-ui={`${scope}.cancel-dialog.back`}>
        Zurück
      </Button>
      <Button type="submit" form="sprint-cancel-form" variant="danger" size="sm"
        disabled={!notes.trim() || busy} data-ui={`${scope}.cancel-dialog.confirm`}>
        {busy ? 'Abbreche…' : 'Abbrechen'}
      </Button>
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
      backdropDataUi={`${scope}.cancel-dialog`}
    >
      <form
        id="sprint-cancel-form"
        onSubmit={(e) => { e.preventDefault(); if (notes.trim()) onConfirm(notes.trim()) }}
        data-ui={`${scope}.cancel-dialog.form`}
      >
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wide text-[var(--hint)]">Begründung *</span>
          <Textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1"
            data-ui={`${scope}.cancel-dialog.notes`}
          />
        </label>
      </form>
    </Modal>
  )
}

function CompleteDialog({ open, onClose, onConfirm, openItems, blockingResults = [], busy, scope }) {
  const [force, setForce] = useState(false)
  const blocked = openItems.length > 0
  // DD-360: passed/done-Issues ohne result blocken den Abschluss (Backend-422).
  // Diese Liste kommt aus der 422-Response — force hilft hier NICHT (result ist Pflicht).
  const missingResult = blockingResults.length > 0
  const footer = (
    <>
      <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}
        data-ui={`${scope}.complete-dialog.back`}>
        Zurück
      </Button>
      <Button variant="primary" size="sm" onClick={() => onConfirm(force)}
        disabled={busy || (blocked && !force) || missingResult}
        className="bg-[var(--accent-success)]"
        data-ui={`${scope}.complete-dialog.confirm`}>
        {busy ? 'Schließe…' : missingResult ? 'result fehlt' : blocked ? 'Force completen' : 'Abschließen'}
      </Button>
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
      backdropDataUi={`${scope}.complete-dialog`}
      dialogDataUi={`${scope}.complete-dialog.panel`}
    >
      <div className="text-sm space-y-2">
        {blocked ? (
          <>
            <p className="text-[var(--text)]">Nicht-passed Items vorhanden:</p>
            <ul className="text-xs font-mono space-y-0.5 text-[var(--subtext1)]">
              {openItems.slice(0, 6).map(it => (
                <li key={it.id} data-ui={`${scope}.complete-dialog.open-item.${it.id}`}>· {it.key} [{it.status}]{it.review ? ` review=${it.review}` : ''}</li>
              ))}
              {openItems.length > 6 && <li>… und {openItems.length - 6} weitere</li>}
            </ul>
            <label className="flex items-center gap-2 mt-3 text-xs text-[var(--accent-warning)]">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} data-ui={`${scope}.complete-dialog.force`} />
              Trotzdem abschließen (force) — wird im Audit-Log markiert
            </label>
          </>
        ) : missingResult ? (
          <>
            <p className="text-[var(--accent-danger)]">result fehlt — diese Issues müssen ein result haben, bevor der Sprint abgeschlossen werden kann:</p>
            <ul className="text-xs font-mono space-y-0.5 text-[var(--subtext1)]">
              {blockingResults.slice(0, 8).map(it => (
                <li key={it.id} data-ui={`${scope}.complete-dialog.blocking-result.${it.id}`}>· {it.key} — {it.title} [{it.status}]</li>
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

export default function SprintActions({
  sprint,
  busy = false,
  openItems = [],
  blockingResults = [],
  onTransition,
  onCancel,
  onRequestComplete,
  onComplete,
  dataUiScope = 'sprint-actions',
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)

  const status = sprint?.status
  // DD-550: `cancelled` fällt absichtlich NICHT mehr in den Terminal-Early-Return —
  // es rendert einen Reopen-Button (cancelled → planning, backend-sanktioniert via DD-524).
  // Nur `completed`/`closed` sind echte Endzustände ohne Lifecycle-Aktion.
  if (status === 'completed' || status === 'closed') return null

  // DD-166 R2/R3: alle Sprint-Lifecycle-Aktionen als gleichgrosse Icon-only-
  // Buttons mit Custom-Tooltip. Kein native title (-> kein Doppel-Tooltip);
  // aria-label bleibt fuer Screen-Reader.
  return (
    <span data-ui={dataUiScope} className="inline-flex items-center gap-1">
      {status === 'planning' && (
        <ToolbarButton onClick={() => onTransition?.('active')} title="Sprint starten" busy={busy}
          colorClass="text-[var(--accent-success)]" Icon={Play} dataUi={`${dataUiScope}.toolbar.start`} />
      )}
      {status === 'active' && (
        <ToolbarButton onClick={() => setCancelOpen(true)} title="Sprint abbrechen (Begründung erforderlich)" busy={busy}
          colorClass="text-[var(--accent-danger)]" Icon={XIcon} dataUi={`${dataUiScope}.toolbar.cancel`} />
      )}
      {status === 'review' && (
        <>
          <ToolbarButton onClick={() => { onRequestComplete?.(); setCompleteOpen(true) }} title="Sprint abschließen (review → completed)" busy={busy}
            colorClass="text-[var(--accent-success)]" Icon={CheckCircle2} dataUi={`${dataUiScope}.toolbar.complete`} />
          <ToolbarButton onClick={() => onTransition?.('active')} title="Sprint zurück zu active (Re-Work)" busy={busy}
            colorClass="text-[var(--accent-warning)]" Icon={RotateCcw} dataUi={`${dataUiScope}.toolbar.rework`} />
          <ToolbarButton onClick={() => setCancelOpen(true)} title="Sprint abbrechen (Begründung erforderlich)" busy={busy}
            colorClass="text-[var(--accent-danger)]" Icon={XIcon} dataUi={`${dataUiScope}.toolbar.cancel`} />
        </>
      )}
      {status === 'cancelled' && (
        <ToolbarButton onClick={() => onTransition?.('planning')} title="Sprint reaktivieren (cancelled → planning)" busy={busy}
          colorClass="text-[var(--accent-info)]" Icon={RotateCcw} dataUi={`${dataUiScope}.toolbar.reopen`} />
      )}
      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={(notes) => { onCancel?.(notes); setCancelOpen(false) }}
        busy={busy}
        scope={dataUiScope}
      />
      <CompleteDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={(force) => onComplete?.(force)}
        openItems={openItems}
        blockingResults={blockingResults}
        busy={busy}
        scope={dataUiScope}
      />
    </span>
  )
}
