/**
 * DefinitionOfDoneForm — Organism (05.60 Overlay). Konkretes DoD-Erfass-/Bearbeiten-Form:
 * komponiert ChecklistFormBase (Modal-Shell + Save/Cancel) und DEFINIERT die DoD-Inhalte.
 * Felder am Schema `milestone_dod_items` (D05 + D10): Kriteriums-Label + Beschreibung
 * (details) + Done-Status.
 *
 * Zwei Modi (ein Form): `item` mit id → edit (vorbefüllt, idTag, Timestamps, onPatch);
 * ohne id → create (leer, onCreate). Erfassen (Req 3) und dod-item.detail (Req 6) öffnen
 * dasselbe Form. Präsentational: Draft lokal, Persistenz via onCreate/onPatch. Höhere
 * Tiers komponieren Atome (Input/Textarea/Button) — kein rohes Primitiv-Markup (GF-206).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {{id?:number, label?:string, details?:string, done?:0|1|boolean, created_at?:string, updated_at?:string}} [props.item]
 * @param {(label:string, details?:string)=>(void|Promise<void>)} [props.onCreate] - create-Modus.
 * @param {(id:number, patch:{label?:string,details?:string,done?:0|1})=>(void|Promise<void>)} [props.onPatch] - edit-Modus.
 * @param {boolean} [props.saving=false]
 */
import { useEffect, useState } from 'react'
import ChecklistFormBase from './ChecklistFormBase.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

// Status-Optionen → done-Boolean (Schema: done 0|1).
const STATUS = [
  { key: 'open', label: 'offen', done: false },
  { key: 'done', label: 'erledigt', done: true },
]

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.05em] text-[var(--subtext0)]'
const FIELD_MONO = 'normal-case tracking-normal [font-family:var(--font-display)]'
// Aktive Status-Tönung am ghost-Button (Text via ! gegen die ghost-Default-Farbe erzwungen,
// Border additiv — kein bg-Konflikt). Inaktiv = transparenter Border (kein Layout-Shift).
const PILL_ACTIVE = {
  open: '!text-[var(--blue)] border-[var(--blue)]',
  done: '!text-[var(--green)] border-[var(--green)]',
}
const PILL_INACTIVE = 'border-transparent'

export default function DefinitionOfDoneForm({ open, onClose, item, onCreate, onPatch, saving = false }) {
  const isEdit = item?.id != null
  const [label, setLabel] = useState(item?.label || '')
  const [details, setDetails] = useState(item?.details || '')
  const [done, setDone] = useState(Boolean(item?.done))

  // Draft beim Öffnen / Item-Wechsel aus den Props seeden.
  useEffect(() => {
    setLabel(item?.label || '')
    setDetails(item?.details || '')
    setDone(Boolean(item?.done))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, open])

  const trimmed = label.trim()

  const handleSave = async () => {
    if (!trimmed) return
    if (isEdit) {
      const patch = {}
      if (label !== item.label) patch.label = label
      if (details !== (item.details || '')) patch.details = details
      if (Boolean(done) !== Boolean(item.done)) patch.done = done ? 1 : 0
      if (Object.keys(patch).length > 0) await onPatch?.(item.id, patch)
    } else {
      await onCreate?.(trimmed, details.trim() || undefined)
    }
    onClose?.()
  }

  return (
    <ChecklistFormBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      saveDisabled={!trimmed}
      headerLabel={isEdit ? 'DoD-Kriterium' : 'DoD erfassen'}
      idTag={isEdit ? `devd:dod:${item.id}` : undefined}
      timestamps={isEdit ? { created_at: item.created_at, updated_at: item.updated_at } : undefined}
      dataUiScope="dod-form"
    >
      <label className={FIELD_LABEL}>
        <span>Kriterium</span>
        <Input
          autoFocus
          surface="bordered"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={280}
          aria-label="DoD-Kriterium"
          data-ui="dod-form.label"
          className={FIELD_MONO}
        />
      </label>

      <label className={FIELD_LABEL}>
        <span>Beschreibung</span>
        <Textarea
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={2000}
          aria-label="DoD-Beschreibung"
          data-ui="dod-form.details"
          className={`min-h-20 ${FIELD_MONO}`}
        />
      </label>

      <div className={FIELD_LABEL}>
        <span>Status</span>
        <div data-ui="dod-form.status" role="radiogroup" aria-label="Status" className="flex gap-2">
          {STATUS.map((s) => {
            const active = done === s.done
            return (
              <Button
                key={s.key}
                variant="ghost"
                size="sm"
                role="radio"
                aria-checked={active}
                onClick={() => setDone(s.done)}
                data-ui={`dod-form.status.${s.key}`}
                className={`border [font-family:var(--font-display)] capitalize ${active ? PILL_ACTIVE[s.key] : PILL_INACTIVE}`}
              >
                {s.label}
              </Button>
            )
          })}
        </div>
      </div>
    </ChecklistFormBase>
  )
}
