/**
 * SlotFullTextWindow — DD-599 (M5c) Volltext-Fenster (Grill D04).
 *
 * Overlay im DetailEditScreen-Muster (fixed inset-0 z-40, Viewport-deckend) für das fokussierte
 * Lesen/Bearbeiten EINES Slots/einer SOP — getrennt vom geclippten Inline-View.
 * PO-Intent (D04): primär fokussiertes LESEN am Mobile; Bearbeiten on demand.
 *
 * Modi (= Initialzustand des Fensters):
 *   - 'read'     → Lese-Fokus; rechts ein „Bearbeiten"-Trigger → Editor (editierbarer Slot/SOP).
 *   - 'edit'     → öffnet direkt im Editor (Textarea + Abbrechen/Speichern).
 *   - 'readonly' → read-only Projektion (Nächste Schritte / Journal): Lock, kein Editor.
 *
 * Reuse OHNE F3-Bruch: bewusst NICHT DetailEditScreen (edit-only, an die F3-
 * Detailseite gekoppelt) — eigener Organism mit denselben Tokens/Geometrie.
 *
 * Controlled offen/zu via `open`. Der Read↔Edit-Umschalter ist INTERN (ephemerer
 * UI-State); `draft` spiegelt `body` und wird beim Öffnen/Body-Wechsel re-initialisiert.
 * `onSave(draft)` reicht den editierten Text an den Konsumenten (Persistenz dort:
 * SSTD setSstdSlot / SOP PUT /api/sops/:key).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title - Slot-/SOP-Titel
 * @param {string} [props.body=''] - Volltext (Lese-/Editor-Quelle)
 * @param {'read'|'edit'|'readonly'} [props.mode='read'] - Initialzustand
 * @param {boolean} [props.saving=false] - Mutation in-flight → Aktionen disabled
 * @param {string} [props.error=''] - Fehlertext der letzten Mutation
 * @param {()=>void} [props.onClose] - Zurück (schließt das Fenster)
 * @param {(nextContent:string)=>void} [props.onSave] - Speichern (Edit)
 * @param {string} [props.dataUiScope='detail.slot-nav.window']
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Lock, Pencil, Save, X } from 'lucide-react'
import Cluster from '../layout/Cluster.jsx'
import Pill from '../atoms/Pill.jsx'
import Button from '../atoms/Button.jsx'

export default function SlotFullTextWindow({
  open,
  title,
  body = '',
  mode = 'read',
  saving = false,
  error = '',
  onClose,
  onSave,
  dataUiScope = 'detail.slot-nav.window',
}) {
  const isReadonly = mode === 'readonly'

  // Ephemerer Read/Edit-Umschalter + Editor-Draft (Spiegel von body).
  const [editing, setEditing] = useState(mode === 'edit')
  const [draft, setDraft] = useState(body)
  useEffect(() => {
    if (open) { setEditing(mode === 'edit'); setDraft(body) }
  }, [open, mode, body])

  if (!open) return null

  const fieldId = `slot-window-${String(title || 'field').toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div
      role="dialog"
      aria-label={editing ? `${title} bearbeiten` : title}
      className="fixed inset-0 z-40 flex flex-col bg-[var(--base)] font-sans"
      data-ui={dataUiScope}
    >
      <Cluster gap="sm" justify="between" className="flex-nowrap shrink-0 border-b border-[var(--surface0)] bg-[var(--mantle)] px-3 py-2">
        <Cluster gap="sm" className="flex-nowrap min-w-0">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} data-ui={`${dataUiScope}.back`}>
            <ArrowLeft size={18} />
          </Button>
          <span className="font-display text-sm font-bold text-[var(--text)] truncate">{title}</span>
        </Cluster>
        {isReadonly ? (
          <Pill color="neutral" variant="ghost" size="sm">
            <Lock size={11} aria-hidden="true" />read-only
          </Pill>
        ) : !editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-ui={`${dataUiScope}.edit-trigger`}>
            <Pencil size={14} />Bearbeiten
          </Button>
        ) : null}
      </Cluster>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {editing ? (
          <textarea
            id={fieldId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            spellCheck={false}
            aria-label={`${title} bearbeiten`}
            data-ui={`${dataUiScope}.field`}
            className="h-full min-h-[16rem] w-full resize-none rounded-md border border-[var(--surface1)] bg-[var(--surface0)] p-3 font-mono text-sm text-[var(--text)] outline-none"
          />
        ) : (
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{body}</p>
        )}
      </div>

      {error && (
        <p data-ui={`${dataUiScope}.error`} className="shrink-0 px-4 pb-1 text-sm text-[var(--accent-danger)]">
          Fehler: {error}
        </p>
      )}

      {editing && (
        <Cluster gap="sm" justify="between" className="flex-nowrap shrink-0 border-t border-[var(--surface0)] bg-[var(--mantle)] px-3 pb-safe-bar pt-2">
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving} data-ui={`${dataUiScope}.cancel`}>
            <X size={16} />Abbrechen
          </Button>
          <Button variant="primary" size="md" onClick={() => onSave?.(draft)} loading={saving} disabled={saving} data-ui={`${dataUiScope}.save`}>
            <Save size={16} />Speichern
          </Button>
        </Cluster>
      )}
    </div>
  )
}
