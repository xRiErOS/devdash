import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import CaptureWidget from '../molecules/CaptureWidget.jsx'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * RelevantFilesWidget — GF-374 V2 Organism (05.30 Widgets). Datei-Links (`relevant_files`)
 * einer Entität in der Terminal-Token-Sprache: komponiert die randlose `CaptureWidget`-Shell
 * mit einem Add-Trigger (Plus-IconButton, create-Slot) in der Toolbar und einer Zeilen-Liste
 * (eine Row je Pfad, mobile-tauglich) im body. KEINE Datei-Suche — das Tool ist Cloud, kein
 * lokales FS (PO 2026-06-19): Pfade werden manuell erfasst. Add-Icon hängt eine leere,
 * editierbare Row an (Ghost-Input, Enter committet); Pre-V2 `RelevantFilesPicker` (Chips)
 * bleibt für die Alt-App bis P4-Cutover.
 *
 * Präsentational/controlled: `files` + `onChange` vom Consumer; `adding`/`draft` sind
 * ephemerer UI-State. Titellos (Titel zentral im Accordion-Slot). Mono, 0 Roh-Hex, Atome
 * (Input/IconButton) statt roher Primitive (L2).
 *
 * data-ui: Wurzel `<scope>` (default `relevant-files-widget`); CaptureShell `<scope>.capture`;
 * Add-Trigger `.add`; Rows `.rows` + je Zeile `.row-<i>`/`.row-<i>.path`/`.row-<i>.remove`;
 * editierbare Neu-Row `.row-new`/`.row-new.input`/`.row-new.remove`; Leer `.empty-hint`.
 *
 * @param {object} props
 * @param {(string|{path:string})[]} [props.files] - committete Pfade.
 * @param {boolean} [props.readOnly=false] - nur Rows, kein Add/Remove.
 * @param {(nextPaths:string[])=>void} [props.onChange]
 * @param {import('react').ReactNode} [props.emptyHint='Keine Datei-Links.']
 * @param {boolean} [props.framed=false]
 * @param {import('react').ReactNode} [props.toolbarLabel] - Label LINKS in der Toolbar-Zeile
 *        (Composer reicht hier sein Sektions-CommentLabel ein, statt es als Header darüber zu setzen).
 * @param {string} [props.dataUiScope='relevant-files-widget']
 * @param {string} [props.className]
 */
export default function RelevantFilesWidget({
  files = [],
  readOnly = false,
  onChange,
  emptyHint = 'Keine Datei-Links.',
  framed = false,
  toolbarLabel,
  dataUiScope = 'relevant-files-widget',
  className = '',
  ...rest
}) {
  const paths = files.map((f) => (typeof f === 'string' ? f : f.path))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const remove = (p) => {
    if (readOnly) return
    onChange?.(paths.filter((x) => x !== p))
  }

  const startAdd = () => {
    setAdding(true)
    setDraft('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const cancelAdd = () => {
    setAdding(false)
    setDraft('')
  }

  const commit = () => {
    const t = draft.trim()
    if (t && !paths.includes(t)) onChange?.([...paths, t])
    setDraft('')
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelAdd() }
  }

  const addSlot = !readOnly ? (
    <IconButton
      icon={<Plus size={16} aria-hidden="true" />}
      label="Datei-Link hinzufügen"
      onClick={startAdd}
      size="sm"
      variant="ghost"
      reveal
      data-ui={`${dataUiScope}.add`}
    />
  ) : undefined

  return (
    <div data-ui={dataUiScope} className={`[font-family:var(--font-display)] ${className}`} {...rest}>
      <CaptureWidget dataUiScope={`${dataUiScope}.capture`} framed={framed} toolbarLabelSlot={toolbarLabel} createSlot={addSlot}>
        {paths.length === 0 && !adding ? (
          <p data-ui={`${dataUiScope}.empty-hint`} className="text-[12px] text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : (
          <ul data-ui={`${dataUiScope}.rows`} className="m-0 flex list-none flex-col gap-1 p-0">
            {paths.map((p, i) => (
              <li
                key={p}
                data-ui={`${dataUiScope}.row-${i}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-elevated)] px-2 py-1"
              >
                <span data-ui={`${dataUiScope}.row-${i}.path`} className="min-w-0 flex-1 truncate text-[12px] text-[var(--text)]">
                  {p}
                </span>
                {!readOnly && (
                  <IconButton
                    icon={<X size={14} aria-hidden="true" />}
                    label={`${p} entfernen`}
                    onClick={() => remove(p)}
                    size="sm"
                    variant="ghost"
                    reveal
                    data-ui={`${dataUiScope}.row-${i}.remove`}
                  />
                )}
              </li>
            ))}
            {adding && (
              <li
                data-ui={`${dataUiScope}.row-new`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-elevated)] px-2 py-1"
              >
                <Input
                  ref={inputRef}
                  surface="transparent"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="// pfad eintippen, Enter zum Hinzufügen"
                  data-ui={`${dataUiScope}.row-new.input`}
                  className="!px-0 !py-0 !text-[12px] [font-family:var(--font-display)]"
                />
                <IconButton
                  icon={<X size={14} aria-hidden="true" />}
                  label="Abbrechen"
                  onClick={cancelAdd}
                  size="sm"
                  variant="ghost"
                  data-ui={`${dataUiScope}.row-new.remove`}
                />
              </li>
            )}
          </ul>
        )}
      </CaptureWidget>
    </div>
  )
}
