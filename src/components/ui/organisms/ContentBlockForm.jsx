/**
 * ContentBlockForm — GF-336 Organism (05.60 Overlay). Konkretes Edit/Update-Form für
 * die benannten Textblöcke eines ContentBlock (D04): komponiert ChecklistFormBase
 * (Modal-Shell blur+Border + Save/Cancel) und rendert JE Block ein labeled
 * `MarkdownField` (note-field — CodeMirror Live-Preview). Ein Form, N Felder, ein
 * EditButton im Widget öffnet es.
 *
 * Präsentational: Draft lokal (Map key→value, beim Öffnen aus `blocks` geseedet wie
 * DefinitionOfDoneForm); Persistenz via `onSave(patch)` mit NUR geänderten Block-
 * Werten (Diff). Höhere Tiers komponieren Atome/Moleküle — kein rohes Primitiv-Markup.
 *
 * data-ui: Wurzel `content-block-form` (Modal-Panel via ChecklistFormBase); je Block
 * `content-block-form.field-<key>` (Feld-Wrapper) + inneres `markdown-field`;
 * `.save`/`.cancel`/`.close` von ChecklistFormBase.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {Array<{key:string, label:string, value?:string}>} [props.blocks=[]] - zu bearbeitende Blöcke.
 * @param {(patch: Record<string,string>) => (void|Promise<void>)} [props.onSave] - nur geänderte Block-Werte.
 * @param {boolean} [props.saving=false]
 * @param {string} [props.headerLabel='Beschreibung bearbeiten'] - Mono-Kopfzeile.
 * @param {string} [props.focusKey] - Block-Key, dessen Editor beim Öffnen fokussiert/gescrollt wird (Option A — pro-Block-EditButton).
 * @param {string} [props.dataUiScope='content-block-form']
 */
import { useEffect, useState } from 'react'
import ChecklistFormBase from './ChecklistFormBase.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.05em] text-[var(--subtext0)]'
const FIELD_MONO = 'normal-case tracking-normal [font-family:var(--font-display)]'

function seed(blocks) {
  const m = {}
  for (const b of blocks) m[b.key] = b.value ?? ''
  return m
}

export default function ContentBlockForm({
  open,
  onClose,
  blocks = [],
  onSave,
  saving = false,
  headerLabel = 'Beschreibung bearbeiten',
  focusKey,
  dataUiScope = 'content-block-form',
}) {
  const [draft, setDraft] = useState(() => seed(blocks))

  // Draft beim Öffnen / Block-Wechsel aus den Props seeden.
  useEffect(() => {
    setDraft(seed(blocks))
  }, [open, blocks])

  // Option A: beim Öffnen den Editor des geklickten Blocks fokussieren + in den Blick
  // scrollen. Client-only (CodeMirror mountet erst im Browser; SSR-safe guard) — rAF
  // wartet auf den Editor-Mount. Modal hat autoFocus={false}, klaut also nichts (L4).
  useEffect(() => {
    if (!open || !focusKey || typeof document === 'undefined') return
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-ui="${dataUiScope}.field-${focusKey}"] .cm-content`)
      if (el) {
        el.focus()
        el.scrollIntoView({ block: 'center' })
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open, focusKey, dataUiScope])

  const handleChange = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const handleSave = async () => {
    const patch = {}
    for (const b of blocks) {
      const next = draft[b.key] ?? ''
      if (next !== (b.value ?? '')) patch[b.key] = next
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
      {blocks.map((b) => (
        <label key={b.key} className={FIELD_LABEL} data-ui={`${dataUiScope}.field-${b.key}`}>
          <span className={FIELD_MONO}>{b.label}</span>
          <MarkdownField
            value={draft[b.key] ?? ''}
            rows={4}
            onChange={(next) => handleChange(b.key, next)}
          />
        </label>
      ))}
    </ChecklistFormBase>
  )
}
