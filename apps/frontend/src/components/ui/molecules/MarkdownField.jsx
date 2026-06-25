import { useEffect, useState } from 'react'
import { MarkdownNoteField } from 'note-field'

// note-field skaliert sein Theme über `data-theme` auf der EIGENEN nf-root (Prop `theme`,
// Default 'auto' → prefers-color-scheme). Die App steuert das Theme aber per `data-theme`
// auf <html> — ohne Sync fällt note-field in Dark-Mode auf den Latte-Default (heller
// Editor-Block, sichtbar in Storybook/headless wo prefers-color-scheme=light). Dieser Hook
// spiegelt das App-Theme reaktiv auf die `theme`-Prop. Node-Render (renderToStaticMarkup,
// kein document/useEffect) bleibt 'auto' = bisheriger Default → keine Snapshot-Drift.
function useDocumentTheme() {
  const read = () =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'auto'
      : 'auto'
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    const el = document.documentElement
    const update = () => setTheme(el.getAttribute('data-theme') || 'auto')
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

/**
 * MarkdownField — DD#61 Molecule, seit DD-365 ein dünner Wrapper um
 * `MarkdownNoteField` aus dem vendored `note-field`-Paket (CodeMirror 6 +
 * ixora Live-Preview, Catppuccin). note-field IST der Editor — diese Molecule
 * hält nur den bestehenden Prop-Vertrag (value + onChange-String) stabil, damit
 * kein Consumer-Aufrufort angefasst werden muss.
 *
 * note-field bringt eine eigene Toolbar inkl. Live-Preview mit; der frühere
 * Edit/Preview-Toggle (mode/onModeChange/defaultMode/previewEmptyLabel) entfällt
 * dadurch. Die Props bleiben akzeptiert (kein Bruch an Aufruforten/Stories),
 * werden aber nicht mehr ausgewertet.
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
  value = '',
  onChange,
  rows = 4,
  placeholder = 'Markdown — **fett**, *kursiv*, # Heading, - Liste, - [ ] Aufgabe',
  disabled = false,
  onUpload,
  onRemove,
  className = '',
  // DD-365: vom Toggle-Modell übrig — akzeptiert, aber von note-field selbst gehandhabt.
  mode: _mode,
  onModeChange: _onModeChange,
  defaultMode: _defaultMode,
  previewEmptyLabel: _previewEmptyLabel,
  ...rest
}) {
  const theme = useDocumentTheme()
  return (
    <div data-ui="markdown-field" className={`relative flex flex-col gap-2 ${className}`} {...rest}>
      <MarkdownNoteField
        value={value}
        onChange={(next) => onChange?.(next)}
        minRows={rows}
        placeholder={placeholder}
        readOnly={disabled}
        theme={theme}
        onUpload={onUpload}
        onRemove={onRemove}
      />
    </div>
  )
}
