/**
 * RelevantFilesPicker — kanonisches, token-sauberes Organism
 * (DD-481 Harvest aus src/components/RelevantFilesPicker.jsx).
 *
 * Domänen-bewusste Einheit: Chip-Liste der `relevant_files` eines Issues plus
 * ein Such-/Autocomplete-Eingabefeld zum Hinzufügen weiterer Pfade. Komponiert
 * die Atoms Input und Pill.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die Autocomplete-Vorschläge selbst via
 *    `fetch('/api/projects/2/files?q=…')` (mit AbortController + Debounce).
 *    Dieser Daten-Fetch ist hier ENTFERNT; die gefilterten Pfad-Vorschläge
 *    kommen als `suggestions`-Prop herein. Den Query-Wechsel meldet die
 *    Komponente über die Callback-Prop `onQueryChange(query)`, sodass der Screen
 *    debouncen/fetchen kann.
 *  - Pfad-Mutationen (add/remove) laufen weiterhin über `onChange(nextPaths)`.
 *
 * Ephemerer UI-State BLEIBT: `adding` (Eingabe offen), `query` (Tipp-Buffer),
 * `activeIdx` (Tastatur-Navigation), `inputRef`/`wrapRef`, Outside-Click-Handler.
 *
 * @param {object} props
 * @param {(string|{path:string})[]} [props.files] - committete Pfade (String oder {path})
 * @param {string[]} [props.suggestions] - gefilterte Autocomplete-Vorschläge (gehoben aus Fetch)
 * @param {boolean} [props.readOnly=false] - nur Chips rendern, kein Add/Remove
 * @param {(nextPaths:string[])=>void} [props.onChange] - Pfad-Liste geändert
 * @param {(query:string)=>void} [props.onQueryChange] - Such-Query geändert (Screen fetcht Vorschläge)
 * @param {string} [props.dataUiScope='relevant-files-picker'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container
 */

import { useEffect, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import Pill from '../atoms/Pill.jsx'

export default function RelevantFilesPicker({
  files = [],
  suggestions = [],
  readOnly = false,
  onChange,
  onQueryChange,
  dataUiScope = 'relevant-files-picker',
  className = '',
}) {
  const paths = files.map((f) => (typeof f === 'string' ? f : f.path))
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  // Bereits committete Pfade aus der Vorschlagsliste filtern (gehoben: der Fetch
  // entfällt, das Dedupe gegen die aktuelle Pfad-Liste bleibt clientseitig).
  const visibleSuggestions = suggestions.filter((s) => !paths.includes(s)).slice(0, 20)

  // DD-163: Such-Interface bei Klick ausserhalb schliessen. Bereits committete
  // Pfade bleiben erhalten (kommen via `files`-Prop, nicht aus dem Query).
  useEffect(() => {
    if (!adding) return
    const handler = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) {
        setAdding(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [adding])

  // Vorschlagsliste schrumpft bei query-Wechsel → activeIdx zurücksetzen.
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const setQ = (next) => {
    setQuery(next)
    onQueryChange?.(next)
  }

  const remove = (p) => {
    if (readOnly) return
    onChange?.(paths.filter((x) => x !== p))
  }

  const add = (p) => {
    const t = (p || '').trim()
    if (!t) return
    if (paths.includes(t)) return
    onChange?.([...paths, t])
    setQ('')
    inputRef.current?.focus()
  }

  const openAdding = () => {
    setAdding(true)
    setQ('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const closeAdding = () => {
    setAdding(false)
    setQ('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // DD-163: stopPropagation, damit das umgebende Detail-Panel nicht
      // gleichzeitig den Edit-Modus verlaesst und der Speichern-Button
      // erreichbar bleibt.
      e.preventDefault()
      e.stopPropagation()
      closeAdding()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (visibleSuggestions[activeIdx]) add(visibleSuggestions[activeIdx])
      else if (query.trim()) add(query)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, visibleSuggestions.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    }
  }

  return (
    <div ref={wrapRef} data-ui={dataUiScope} className={className}>
      <div data-ui={`${dataUiScope}.chips`} className="flex flex-wrap gap-1.5">
        {paths.map((p) => (
          <Pill
            key={p}
            variant="filled"
            color="neutral"
            size="md"
            data-ui={`${dataUiScope}.chips.item`}
            className="font-mono text-[var(--text)]"
          >
            <span>{p}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={`${p} entfernen`}
                data-ui={`${dataUiScope}.chips.remove`}
                className="text-[var(--subtext1)] hover:opacity-70"
              >
                <X size={11} />
              </button>
            )}
          </Pill>
        ))}
        {!readOnly && !adding && (
          <button
            type="button"
            onClick={openAdding}
            data-ui={`${dataUiScope}.add`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--surface0)] text-[var(--subtext0)] border border-dashed border-[var(--surface2)]"
          >
            <Plus size={12} /> Datei
          </button>
        )}
      </div>
      {adding && !readOnly && (
        <div data-ui={`${dataUiScope}.search`} className="mt-2 relative">
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pfad suchen oder eintippen…"
            data-ui={`${dataUiScope}.search.input`}
            onKeyDown={handleKeyDown}
          />
          {visibleSuggestions.length > 0 && (
            <div
              data-ui={`${dataUiScope}.search.suggestions`}
              className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-lg overflow-hidden z-30 bg-[var(--surface0)] border border-[var(--surface2)]"
            >
              {visibleSuggestions.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    add(f)
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  data-ui={`${dataUiScope}.search.suggestions.item`}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono text-[var(--text)] ${
                    i === activeIdx ? 'bg-[var(--surface1)]' : 'bg-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div data-ui={`${dataUiScope}.search.hint`} className="flex gap-2 mt-2 text-[11px] text-[var(--subtext1)]">
            <span>Enter: hinzufügen · Esc: schließen · ↑↓: navigieren</span>
            <button
              type="button"
              onClick={closeAdding}
              data-ui={`${dataUiScope}.search.close`}
              className="ml-auto text-[var(--subtext0)] hover:underline"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
