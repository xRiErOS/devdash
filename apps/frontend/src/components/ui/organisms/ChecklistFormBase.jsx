/**
 * ChecklistFormBase — Organism (05.60 Overlay). Präsentationale GRUNDLAGE für
 * erfassende Formulare Checklisten-artiger Domänen (DoD, künftig ToDo etc.). Abstrahiert
 * das gemeinsame Gerüst aus dem alten ChecklistDetailModal (DD-481): Modal-Shell
 * (blur-Backdrop + Border per D04) + Feld-Region (children) + Speichern/Abbrechen-Footer
 * mit optionalen Meta (idTag + Timestamps für den edit-Modus).
 *
 * INHALTSAGNOSTISCH: die konkreten Felder liefert der komponierende Form-Organismus als
 * `children` (z.B. DefinitionOfDoneForm). Kein Store/Fetch/Domänen-Begriff — `onSave`
 * ist Callback, Draft-State lebt im konkreten Form. Mono (--font-display), token-clean.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {() => (void|Promise<void>)} [props.onSave]
 * @param {boolean} [props.saving=false] - Submit-in-flight → Save zeigt … + ist disabled.
 * @param {boolean} [props.saveDisabled=false] - fachliche Submit-Sperre (z.B. leeres Label).
 * @param {import('react').ReactNode} [props.headerLabel] - Mono-Kopfzeile (z.B. 'DoD-Kriterium').
 * @param {import('react').ReactNode} [props.idTag] - optionaler ID-Pill (edit-Modus).
 * @param {{created_at?:string, updated_at?:string}} [props.timestamps] - optional → Footer-Meta.
 * @param {string} [props.saveLabel='Speichern']
 * @param {string} [props.cancelLabel='Abbrechen']
 * @param {string} [props.dataUiScope='checklist-form'] - Wurzel-data-ui-Bereich (parametrisiert).
 * @param {import('react').ReactNode} [props.children] - Feld-Region.
 */
import { X } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'

const HEADER_LABEL = 'flex-1 text-[11px] uppercase tracking-[0.08em] text-[var(--subtext0)] [font-family:var(--font-display)]'
const ID_PILL = 'text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--base)] border border-[var(--surface2)] text-[var(--text)] [font-family:var(--font-display)]'

function fmt(raw) {
  return raw ? new Date(raw).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export default function ChecklistFormBase({
  open,
  onClose,
  onSave,
  saving = false,
  saveDisabled = false,
  headerLabel,
  idTag,
  timestamps,
  saveLabel = 'Speichern',
  cancelLabel = 'Abbrechen',
  dataUiScope = 'checklist-form',
  children,
}) {
  const titleId = `${dataUiScope}-title`

  const titleNode = (
    <span className="flex items-center gap-3 w-full">
      <span id={titleId} className={HEADER_LABEL}>
        {headerLabel}
      </span>
      {idTag != null && (
        <span data-ui={`${dataUiScope}.id`} title={String(idTag)} className={ID_PILL}>
          {idTag}
        </span>
      )}
      <IconButton
        icon={<X size={16} aria-hidden="true" />}
        label="Schließen"
        onClick={onClose}
        size="sm"
        variant="ghost"
        data-ui={`${dataUiScope}.close`}
      />
    </span>
  )

  const footerNode = (
    <span className="flex items-center w-full gap-3">
      {timestamps && (
        <span data-ui={`${dataUiScope}.timestamps`} className="flex-1 text-[10px] text-[var(--subtext0)] [font-family:var(--font-display)]">
          Created: {fmt(timestamps.created_at)} · Updated: {fmt(timestamps.updated_at)}
        </span>
      )}
      {!timestamps && <span className="flex-1" />}
      <Button variant="ghost" size="sm" onClick={onClose} data-ui={`${dataUiScope}.cancel`} className="[font-family:var(--font-display)]">
        {cancelLabel}
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSave}
        loading={saving}
        disabled={saveDisabled}
        data-ui={`${dataUiScope}.save`}
        className="[font-family:var(--font-display)]"
      >
        {saveLabel}
      </Button>
    </span>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      blurBackdrop
      autoFocus={false}
      title={titleNode}
      labelledById={titleId}
      footer={footerNode}
      padded={false}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <div className="px-5 py-5 flex flex-col gap-4 [font-family:var(--font-display)]">{children}</div>
    </Modal>
  )
}
