/**
 * TextEditModal — Organism (DD-481 Phase 5 Gap G5).
 *
 * Wiederverwendbares Overlay zum bequemen LESEN & BEARBEITEN eines einzelnen
 * Markdown-/Freitext-Felds (z. B. Project-Summary „Was wurde erreicht" /
 * „Nächste Schritte", Vision, Goals). Komponiert das Modal-Molecule + Textarea-Atom
 * + Button-Atom. Großzügiges Mono-Textarea (Markdown-freundlich) macht lange Prosa
 * angenehm lesbar/editierbar. Footer: Speichern + Abbrechen.
 *
 * HINWEIS (#6): Live-Markdown-VORSCHAU (Edit↔View-Toggle) ist bewusst NICHT enthalten —
 * das Repo hat keinen Markdown-Renderer als Dependency (nur @codemirror/lang-markdown,
 * kein react-markdown/marked). Editier-Modus = Markdown-Quelltext (Mono). Eine
 * Rendered-View ist ein separates Improvement, sobald ein Renderer eingezogen wird.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Der initiale Wert kommt als
 * Prop `value`; gespeichert wird über die Callback-Prop `onSave(text)`. EINZIGER
 * eigener State ist der ephemere Editier-Draft (kein Daten-State) — er wird bei
 * jedem Öffnen aus `value` neu geseedet (Form-Save-UX: Snapshot vor Save, Reset
 * bleibt beim Konsumenten).
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex (Modal/Textarea/Button tragen alle Tokens).
 *
 * @param {object} props
 * @param {boolean} props.open - sichtbar
 * @param {string} [props.title='Bearbeiten'] - Modal-Titel
 * @param {string} [props.label] - optionales Feld-Label über dem Textarea
 * @param {string} [props.value=''] - initialer Textwert (seedet den Draft beim Öffnen)
 * @param {number} [props.rows=8] - sichtbare Textarea-Zeilen
 * @param {string} [props.placeholder]
 * @param {string} [props.hint] - optionaler Hinweis unter dem Label (z. B. „eine Zeile = ein Goal")
 * @param {(text:string)=>void} props.onSave - Speichern-Callback (erhält den Draft)
 * @param {()=>void} props.onClose - Schließen/Abbrechen
 * @param {string} [props.dataUiScope='text-edit-modal'] - Wurzel-data-ui-bereich (I03/D01)
 */
import { useEffect, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

export default function TextEditModal({
  open,
  title = 'Bearbeiten',
  label,
  value = '',
  rows = 8,
  placeholder,
  hint,
  onSave,
  onClose,
  dataUiScope = 'text-edit-modal',
}) {
  const [draft, setDraft] = useState(value)

  // Draft beim Öffnen (oder bei neuem Quellwert) aus value neu seeden.
  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const handleSave = () => {
    onSave?.(draft)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      dialogDataUi={dataUiScope}
      autoFocus={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} data-ui={`${dataUiScope}.cancel`}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleSave} data-ui={`${dataUiScope}.save`}>
            Speichern
          </Button>
        </>
      }
    >
      {label && (
        <label
          htmlFor={`${dataUiScope}-field`}
          className="block text-[11px] uppercase tracking-wide text-[var(--subtext0)] mb-1"
        >
          {label}
        </label>
      )}
      {hint && <p className="m-0 mb-2 text-xs text-[var(--subtext0)]">{hint}</p>}
      <Textarea
        id={`${dataUiScope}-field`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        autoFocus
        className="font-mono"
        data-ui={`${dataUiScope}.field`}
      />
    </Modal>
  )
}
