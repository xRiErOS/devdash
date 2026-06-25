/**
 * MetaDataForm — GF-414 Organism (05.60 Overlay). Kanonisches Edit/Update-Form für die
 * Meta-/Stammdaten eines EntityDetail (PO-Rework 2026-06-19, #3). Der ghost-Edit-Button
 * des `MetaDataWidget` öffnet dieses Form. Spiegelt den ContentBlockForm-Kanon: komponiert
 * `ChecklistFormBase` (Modal-Shell blur+Border + Save/Cancel) und rendert JE editierbares
 * Feld ein labeled Control — `Select` (control:'select') oder `Input` (control:'text').
 * Ein Form, N Felder, ein EditButton im Widget öffnet es.
 *
 * Präsentational: Draft lokal (Map key→value, beim Öffnen aus `fields` geseedet wie
 * ContentBlockForm); Persistenz via `onSave(patch)` mit NUR geänderten Werten (Diff).
 * Read-only-Felder (ID/Erstellt) gehören NICHT ins Form — der Consumer reicht nur die
 * editierbaren Felder. Token-clean, mono (--font-display).
 *
 * data-ui: Wurzel `meta-data-form` (Modal-Panel via ChecklistFormBase); je Feld
 * `meta-data-form.field-<key>` (Wrapper); `.save`/`.cancel`/`.close` von ChecklistFormBase.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {Array<{key:string, label:string, control:'select'|'text', value?:any, options?:Array}>} [props.fields=[]]
 * @param {(patch: Record<string,any>) => (void|Promise<void>)} [props.onSave] - nur geänderte Werte.
 * @param {boolean} [props.saving=false]
 * @param {string} [props.headerLabel='Meta bearbeiten'] - Mono-Kopfzeile.
 * @param {string} [props.dataUiScope='meta-data-form']
 */
import { useEffect, useState } from 'react'
import ChecklistFormBase from './ChecklistFormBase.jsx'
import Input from '../atoms/Input.jsx'
import Select from '../molecules/Select.jsx'

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.05em] text-[var(--subtext0)]'
const FIELD_MONO = 'normal-case tracking-normal [font-family:var(--font-display)]'

function seed(fields) {
  const m = {}
  for (const f of fields) m[f.key] = f.value ?? ''
  return m
}

export default function MetaDataForm({
  open,
  onClose,
  fields = [],
  onSave,
  saving = false,
  headerLabel = 'Meta bearbeiten',
  dataUiScope = 'meta-data-form',
}) {
  const [draft, setDraft] = useState(() => seed(fields))

  // Draft beim Öffnen / Feld-Wechsel aus den Props seeden (wie ContentBlockForm).
  useEffect(() => {
    setDraft(seed(fields))
  }, [open, fields])

  const handleChange = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const handleSave = async () => {
    const patch = {}
    for (const f of fields) {
      const next = draft[f.key] ?? ''
      if (next !== (f.value ?? '')) patch[f.key] = next
    }
    if (Object.keys(patch).length > 0) await onSave?.(patch)
    onClose?.()
  }

  return (
    <ChecklistFormBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      headerLabel={headerLabel}
      dataUiScope={dataUiScope}
    >
      {fields.map((f) => (
        <label key={f.key} className={FIELD_LABEL} data-ui={`${dataUiScope}.field-${f.key}`}>
          <span className={FIELD_MONO}>{f.label}</span>
          {f.control === 'select' ? (
            <Select
              value={draft[f.key] ?? ''}
              options={f.options || []}
              onChange={(next) => handleChange(f.key, next)}
              size="sm"
              ariaLabel={f.label}
              placeholder="—"
            />
          ) : (
            <Input
              value={draft[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value)}
              aria-label={f.label}
            />
          )}
        </label>
      ))}
    </ChecklistFormBase>
  )
}
