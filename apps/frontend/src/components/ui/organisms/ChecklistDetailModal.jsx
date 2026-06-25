/**
 * ChecklistDetailModal — generisches, token-sauberes Detail-Editor-Modal für
 * Checklisten-artige Domänen (DD-481, T13). Vollständige Übernahme des fertigen
 * TodoDetailModal-Designs (DD-283/DD-451), verallgemeinert über `variant`:
 * Titel, Status-Toggle als Tint-Pills, Auto-Grow-Details-Textarea, verlinkte
 * Dokumente + AddLinkPicker. Komponiert das Modal-Molecule + AddLinkPicker.
 *
 * VARIANTEN (`variant`): nur Status-Set, Header-Label und ID-Präfix unterscheiden
 * sich — Aufbau, Tokens und Verhalten sind identisch:
 *   - `todo` → ToDo-Detail (Project-Home Todos-Tab); Status open/done/cancelled
 *   - `dod`  → Definition-of-Done-Kriterium (Milestone-Details); Status open/done
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Der
 * `onPatch(id, patch)`-Vertrag (nur geänderte Felder) bleibt; Form-Draft +
 * Submit-/Fehler-State bleiben lokaler UI-Draft. DoD-Konsumenten adaptieren ihr
 * `done:0|1` beim Öffnen auf `status:'open'|'done'` und im Patch zurück.
 *
 * Ephemerer UI-State (BLEIBT lokal — KEIN Daten-State):
 *  - `label`/`details`/`status`: Form-Draft, seeded aus `item` beim id-Wechsel.
 *  - `saving`: Submit-In-Flight.
 *  - Details-Feld ist seit DD-365 ein MarkdownNoteField (note-field); der frühere
 *    detailsRef-Auto-Grow-useEffect (DD-339) entfällt — der Editor wächst selbst.
 *
 * @param {object} props
 * @param {object} props.item - Datensatz: { id, label, details, status,
 *                              created_at?, updated_at?, links?: [{id,type,target}] }
 * @param {'todo'|'dod'} [props.variant='todo'] - Beschriftungs-/Status-Preset
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {(id:number, patch:object)=>(void|Promise<void>)} [props.onPatch] - Felder-Patch-Mutation (gehoben)
 * @param {(id:number, link:{type:string,target:string})=>(void|Promise<void>)} [props.onAddLink] - Link-hinzufügen (gehoben)
 * @param {(id:number, linkId:number)=>void} [props.onRemoveLink] - Link-entfernen (gehoben)
 * @param {(key:string)=>void} [props.onOpenIssue] - Issue-Link öffnen
 * @param {string} [props.dataUiScope='checklist-detail-modal'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useEffect, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import AddLinkPicker from './AddLinkPicker.jsx'
import TodoLinksList from './TodoLinksList.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'

// Varianten-Preset: nur Status-Set, Header-Label und ID-Präfix variieren.
const VARIANTS = {
  todo: { statuses: ['open', 'done', 'cancelled'], headerLabel: 'ToDo-Detail', idPrefix: 'devd:todo' },
  dod: { statuses: ['open', 'done'], headerLabel: 'DoD-Detail', idPrefix: 'devd:dod' },
}

// Status-Toggle → statische Tint-Token-Klassen je Status (JIT-sichtbar, keine Interpolation).
const STATUS_CLASSES = {
  open: 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)] text-[var(--accent-info)] border-[var(--accent-info)]',
  done: 'bg-[color-mix(in_srgb,var(--accent-success)_18%,transparent)] text-[var(--accent-success)] border-[var(--accent-success)]',
  cancelled: 'bg-[color-mix(in_srgb,var(--overlay0)_18%,transparent)] text-[var(--overlay0)] border-[var(--overlay0)]',
}
const STATUS_INACTIVE = 'bg-transparent text-[var(--subtext0)] border-[var(--surface0)]'

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] text-[var(--subtext0)] tracking-[0.05em] uppercase font-display'
const INPUT_CLASS = 'px-3 py-2.5 bg-[var(--base)] text-[var(--text)] border border-[var(--surface0)] rounded-md text-base outline-none normal-case tracking-normal transition-[border-color] focus:border-[var(--peach)]'
const BTN_SECONDARY = 'px-4 py-2 bg-transparent text-[var(--subtext0)] border border-[var(--surface0)] rounded-md font-display text-xs font-bold cursor-pointer'
const BTN_PRIMARY = 'px-4 py-2 bg-[var(--peach)] text-[var(--on-accent)] border-0 rounded-md font-display text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export default function ChecklistDetailModal({
  item,
  variant = 'todo',
  open,
  onClose,
  onPatch,
  onAddLink,
  onRemoveLink,
  onOpenIssue,
  dataUiScope = 'checklist-detail-modal',
}) {
  const preset = VARIANTS[variant] ?? VARIANTS.todo
  const [label, setLabel] = useState(item?.label || '')
  const [details, setDetails] = useState(item?.details || '')
  const [status, setStatus] = useState(item?.status || preset.statuses[0])
  const [saving, setSaving] = useState(false)

  // Form-Draft beim Öffnen / Item-Wechsel aus den Props seeden.
  useEffect(() => {
    if (item) {
      setLabel(item.label || '')
      setDetails(item.details || '')
      setStatus(item.status || preset.statuses[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])
  // DD-365: Details ist jetzt ein MarkdownNoteField (note-field) — der Editor
  // wächst selbst (minRows + Auto-Grow); der frühere detailsRef-Auto-Grow-
  // useEffect (DD-339) entfällt.

  if (!item) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch = {}
      if (label !== item.label) patch.label = label
      if (details !== item.details) patch.details = details
      if (status !== item.status) patch.status = status
      if (Object.keys(patch).length > 0) await onPatch?.(item.id, patch)
      onClose?.()
    } catch { /* error vom Konsumenten */ } finally {
      setSaving(false)
    }
  }

  const dt = (raw) => raw ? new Date(raw).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  const titleId = `${dataUiScope}-title`
  const idTag = `${preset.idPrefix}:${item.id}`

  const titleNode = (
    <span className="flex items-center gap-3 w-full">
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-[color-mix(in_srgb,var(--accent-success)_18%,transparent)] text-[var(--accent-success)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </span>
      <span id={titleId} className="flex-1 text-xs text-[var(--subtext0)] font-display">
        {preset.headerLabel}
      </span>
      <span
        data-ui={`${dataUiScope}.id`}
        title={idTag}
        className="text-[11px] px-2 py-0.5 rounded bg-[var(--base)] border border-[var(--surface0)] text-[var(--text)] font-mono"
      >
        {idTag}
      </span>
      <button
        type="button"
        aria-label="Modal schließen"
        data-ui={`${dataUiScope}.close`}
        onClick={onClose}
        className="bg-transparent border-0 text-[var(--subtext0)] cursor-pointer text-lg px-1"
      >
        ×
      </button>
    </span>
  )

  const footer = (
    <span className="flex items-center w-full gap-3">
      <span data-ui={`${dataUiScope}.timestamps`} className="flex-1 text-[10px] text-[var(--subtext0)] font-mono">
        Created: {dt(item.created_at)} · Updated: {dt(item.updated_at)}
      </span>
      <button type="button" onClick={onClose} data-ui={`${dataUiScope}.cancel`} className={BTN_SECONDARY}>
        Abbrechen
      </button>
      <button type="button" onClick={handleSave} disabled={saving} data-ui={`${dataUiScope}.save`} className={BTN_PRIMARY}>
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
      labelledById={titleId}
      footer={footer}
      padded={false}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <div className="px-5 py-5 flex flex-col gap-4">
        <label className={FIELD_LABEL}>
          <span>Titel</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={280}
            data-ui={`${dataUiScope}.title`}
            className={INPUT_CLASS}
          />
        </label>

        <div className={FIELD_LABEL}>
          <span>Status</span>
          <div data-ui={`${dataUiScope}.status`} role="radiogroup" aria-label="Status" className="flex gap-2">
            {preset.statuses.map((s) => {
              const active = status === s
              const cls = active ? (STATUS_CLASSES[s] || STATUS_INACTIVE) : STATUS_INACTIVE
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(s)}
                  data-ui={`${dataUiScope}.status.${s}`}
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
          <div data-ui={`${dataUiScope}.details`}>
            <MarkdownField
              value={details}
              onChange={setDetails}
              rows={4}
            />
          </div>
          <span data-ui={`${dataUiScope}.hint-md`} className="text-[10px] text-[var(--subtext0)] normal-case tracking-normal font-mono">
            Markdown · Wiki-Links · obsidian:// URLs
          </span>
        </div>

        <div className={FIELD_LABEL}>
          <span>Verlinkte Dokumente</span>
          <TodoLinksList
            links={item.links || []}
            dataUiScope={`${dataUiScope}.links`}
            onRemoveLink={(linkId) => onRemoveLink?.(item.id, linkId)}
            onIssueClick={onOpenIssue}
          />
          <AddLinkPicker onAdd={(body) => onAddLink?.(item.id, body)} />
        </div>
      </div>
    </Modal>
  )
}
