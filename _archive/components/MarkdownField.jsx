import { MarkdownNoteField } from 'note-field'

/**
 * MarkdownField — seit DD-365 ein dünner Wrapper um `MarkdownNoteField` aus dem
 * vendored `note-field`-Paket. Vorher ein eigener CodeMirror-6-/ixora-Editor;
 * note-field IST jetzt der Editor (CodeMirror 6 + ixora Live-Preview, Catppuccin).
 * Der bestehende Prop-Vertrag bleibt unverändert, damit kein Aufrufort angepasst
 * werden muss; intern wird auf die note-field-API gemappt.
 *
 * onChange liefert (wie schon zuvor) direkt den Markdown-String — note-field ruft
 * `onChange(value)` mit dem neuen String (kein DOM-Event).
 *
 * @param {object} props
 * @param {string} [props.value] - Markdown-Roh-Text (kontrolliert)
 * @param {(value: string) => void} [props.onChange] - Callback mit neuem Markdown-String
 * @param {number} [props.rows=4] - Mindesthöhe in Zeilen (→ note-field `minRows`)
 * @param {string} [props.placeholder] - Platzhalter im leeren Feld
 * @param {boolean} [props.disabled=false] - deaktiviert Eingabe (→ `readOnly`)
 * @param {(file: File) => (Promise<string>|string)} [props.onUpload] - Bild-Upload-Hook
 * @param {(url: string) => void} [props.onRemove] - Bild-Entfernen-Signal
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Element
 */
export default function MarkdownField({
  value,
  onChange,
  rows = 4,
  placeholder = 'Markdown — **fett**, *kursiv*, # Heading, - Liste, - [ ] Aufgabe',
  disabled = false,
  onUpload,
  onRemove,
  className = '',
  // DD-365: Legacy-Escape-Hatch des alten CodeMirror-Wrappers (onBlur/onPaste/
  // autoFocus). Kein Aufrufort nutzt das; akzeptiert, aber nicht mehr ausgewertet.
  textareaProps: _textareaProps,
}) {
  return (
    <div className={`relative ${className}`}>
      <MarkdownNoteField
        value={value || ''}
        onChange={(next) => onChange?.(next)}
        minRows={rows}
        maxHeight="60vh"
        placeholder={placeholder}
        readOnly={disabled}
        onUpload={onUpload}
        onRemove={onRemove}
      />
    </div>
  )
}
