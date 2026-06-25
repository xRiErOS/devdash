// DD-283 R4 (M3-S02 T03): Detail-Modal 1:1 aus DD39-Mockup (.modal Z.630-747).
// Backdrop blur, max-width 640/radius 12, Header teal-Icon + Mono-Title + ID-Pill,
// base-bg Inputs mit peach-Focus, Status als Tint-Pills (open=blue/done=teal/cancelled=overlay),
// Footer Save = peach + Mono, hint-md. Issue-Links im Modal klickbar (onOpenIssue).
// DD-451: auf zentrales ui/Modal migriert (size md, blurBackdrop, labelledById).
// Backdrop/Panel/ESC/Backdrop-Close + role=dialog zentral.

import { useEffect, useState } from 'react'
import { TODO_STATUSES } from '../../lib/projectHomeApi.js'
import TodoLinksList from './TodoLinksList.jsx'
import AddLinkPicker from './AddLinkPicker.jsx'
import Modal from '../ui/molecules/Modal.jsx'
import MarkdownField from '../MarkdownField.jsx'

const STATUS_CLASSES = {
  open: { active: 'bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-[var(--blue)] border-[var(--blue)]' },
  done: { active: 'bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)] border-[var(--teal)]' },
  cancelled: { active: 'bg-[color-mix(in_srgb,var(--overlay0)_18%,transparent)] text-[var(--overlay0)] border-[var(--overlay0)]' },
}
const STATUS_INACTIVE = 'bg-transparent text-[var(--subtext0)] border-[var(--surface0)]'

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] text-[var(--subtext0)] tracking-[0.05em] uppercase font-display'
const INPUT_CLASS = 'px-3 py-2.5 bg-[var(--base)] text-[var(--text)] border border-[var(--surface0)] rounded-md text-base outline-none normal-case tracking-normal transition-[border-color] focus:border-[var(--peach)]'
const BTN_SECONDARY = 'px-4 py-2 bg-transparent text-[var(--subtext0)] border border-[var(--surface0)] rounded-md font-display text-xs font-bold cursor-pointer'
const BTN_PRIMARY = 'px-4 py-2 bg-[var(--peach)] text-[var(--on-accent)] border-0 rounded-md font-display text-xs font-bold cursor-pointer'

export default function TodoDetailModal({ todo, open, onClose, onPatch, onAddLink, onRemoveLink, onOpenIssue }) {
  const [label, setLabel] = useState(todo?.label || '')
  const [details, setDetails] = useState(todo?.details || '')
  const [status, setStatus] = useState(todo?.status || 'open')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (todo) {
      setLabel(todo.label || '')
      setDetails(todo.details || '')
      setStatus(todo.status || 'open')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.id])
  // DD-365: Details ist jetzt ein MarkdownNoteField (note-field) — der Editor
  // wächst selbst mit dem Inhalt (minRows + Auto-Grow), daher entfällt der
  // frühere detailsRef-Auto-Grow-useEffect (DD-339, B04).

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch = {}
      if (label !== todo.label) patch.label = label
      if (details !== todo.details) patch.details = details
      if (status !== todo.status) patch.status = status
      if (Object.keys(patch).length > 0) await onPatch?.(todo.id, patch)
      onClose?.()
    } catch { /* error vom Hook */ } finally {
      setSaving(false)
    }
  }

  if (!todo) return null

  const dt = (raw) => raw ? new Date(raw).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  const titleNode = (
    <span className="flex items-center gap-3 w-full">
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </span>
      <span
        id="todo-detail-modal-title"
        className="flex-1 text-xs text-[var(--subtext0)] font-display"
      >
        ToDo-Detail
      </span>
      <span
        data-ui="todo-detail-modal.id"
        title={`devd:todo:${todo.id}`}
        className="text-[11px] px-2 py-0.5 rounded bg-[var(--base)] border border-[var(--surface0)] text-[var(--text)] font-mono"
      >
        devd:todo:{todo.id}
      </span>
      <button
        type="button"
        aria-label="Modal schließen"
        data-ui="todo-detail-modal.close"
        onClick={onClose}
        className="bg-transparent border-0 text-[var(--subtext0)] cursor-pointer text-lg px-1"
      >
        ×
      </button>
    </span>
  )

  const footer = (
    <span className="flex items-center w-full gap-3">
      <span data-ui="todo-detail-modal.timestamps" className="flex-1 text-[10px] text-[var(--subtext0)] font-mono">
        Created: {dt(todo.created_at)} · Updated: {dt(todo.updated_at)}
      </span>
      <button type="button" onClick={onClose} data-ui="todo-detail-modal.cancel" className={BTN_SECONDARY}>
        Abbrechen
      </button>
      <button type="button" onClick={handleSave} disabled={saving} data-ui="todo-detail-modal.save" className={BTN_PRIMARY}>
        {saving ? '…' : 'Speichern'}
      </button>
    </span>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      blurBackdrop
      title={titleNode}
      labelledById="todo-detail-modal-title"
      footer={footer}
      padded={false}
      backdropDataUi="todo-detail-modal.backdrop"
      dialogDataUi="todo-detail-modal"
    >
      <div className="px-5 py-5 flex flex-col gap-4">
        <label className={FIELD_LABEL}>
          <span>Titel</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={280}
            data-ui="todo-detail-modal.title"
            className={INPUT_CLASS}
          />
        </label>

        <div className={FIELD_LABEL}>
          <span>Status</span>
          <div data-ui="todo-detail-modal.status" role="radiogroup" aria-label="Status" className="flex gap-2">
            {TODO_STATUSES.map((s) => {
              const active = status === s
              const cls = active ? (STATUS_CLASSES[s]?.active || STATUS_INACTIVE) : STATUS_INACTIVE
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(s)}
                  data-ui={`todo-detail-modal.status.${s}`}
                  className={`px-3 py-1.5 border rounded-md font-display text-xs font-semibold cursor-pointer capitalize ${cls}`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div className={FIELD_LABEL}>
          <span>Details</span>
          <div data-ui="todo-detail-modal.details">
            <MarkdownField
              value={details}
              onChange={setDetails}
              rows={4}
            />
          </div>
          <span data-ui="todo-detail-modal.hint-md" className="text-[10px] text-[var(--subtext0)] normal-case tracking-normal font-mono">
            Markdown · Wiki-Links · obsidian:// URLs
          </span>
        </div>

        <div className={FIELD_LABEL}>
          <span>Verlinkte Dokumente</span>
          <TodoLinksList
            links={todo.links || []}
            onRemove={(linkId) => onRemoveLink?.(todo.id, linkId)}
            onOpenIssue={onOpenIssue}
          />
          <AddLinkPicker onAdd={(body) => onAddLink?.(todo.id, body)} />
        </div>
      </div>
    </Modal>
  )
}
