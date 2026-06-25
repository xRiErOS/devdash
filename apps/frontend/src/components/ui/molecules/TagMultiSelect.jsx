import { useState, useEffect, useRef, useId, useMemo } from 'react'
import Pill from '../atoms/Pill.jsx'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'

/**
 * TagMultiSelect — DD-56 Molecule (harvest aus components/TagMultiSelect.jsx,
 * verlustfrei + entkoppelt). Generisches Multi-Select über eine beliebige
 * Options-Liste: ARIA-Combobox-Pattern (W3C) mit Pfeiltasten-Navigation,
 * Enter-Selektion, Home/End, Backspace-Remove und Esc-Handoff.
 *
 * Props-driven: kein Store, kein Fetch. Tag-Anlage wird über `onCreate`
 * an den Aufrufer delegiert. Selektierte Chips rendern über das
 * ../atoms/Pill.jsx-Atom (outline-Variante, Farbe via statischer Palette-Map).
 *
 * @param {object} props
 * @param {Array<{value:(string|number), label:string, color?:string, meta?:React.ReactNode}>} props.options - Auswahlmenge
 * @param {Array<string|number>} [props.value] - selektierte option.value
 * @param {(values:Array<string|number>) => void} props.onChange - neue Selektion
 * @param {boolean} [props.allowCreate=false] - Create-Suggestion am Listen-Ende
 * @param {(name:string) => void} [props.onCreate] - Aufruf bei Create-Commit (Aufrufer legt an + ruft onChange)
 * @param {boolean} [props.loading=false] - zeigt "Laden…"-Platzhalter
 * @param {() => void} [props.onEscape] - Fokus-Handoff bei Esc
 * @param {string} [props.placeholder='Suchen oder anlegen…']
 * @param {string} [props.emptyHint='Keine weiteren Einträge']
 * @param {string} [props.noMatchHint='Keine Treffer']
 * @param {string} [props.testIdPrefix] - optionales data-testid-Präfix je Option (`${prefix}${value}`), z.B. für e2e-Selektoren
 * @param {string} [props.className]
 */

// Catppuccin-Tag-Farben → Pill-Palette (outline-Variante). Statisch, damit der
// Tailwind-JIT die Pill-Klassen literal sieht; unbekannte Farben → 'neutral'.
const COLOR_TO_PALETTE = {
  blue: 'info',
  green: 'success',
  peach: 'warning',
  mauve: 'primary',
  teal: 'info',
  overlay0: 'neutral',
  red: 'danger',
}

const paletteFor = (color) => COLOR_TO_PALETTE[color] || 'neutral'

export default function TagMultiSelect({
  options = [],
  value = [],
  onChange,
  allowCreate = false,
  onCreate,
  loading = false,
  onEscape,
  placeholder = 'Suchen oder anlegen…',
  emptyHint = 'Keine weiteren Einträge',
  noMatchHint = 'Keine Treffer',
  testIdPrefix = '',
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapRef = useRef(null)
  const listboxRef = useRef(null)
  // Das Such-<input> lebt jetzt im Input-Atom (kein forwardRef) → DOM-Node über den
  // data-ui-Anker im Wrapper auflösen, statt einen eigenen Ref ans Atom zu hängen.
  const inputEl = () => wrapRef.current?.querySelector('[data-ui="tag-multi-select.input"]')
  // Stabile IDs für ARIA aria-controls/aria-activedescendant.
  const listboxId = useId()
  const optionId = (i) => `${listboxId}-opt-${i}`
  const createId = `${listboxId}-create`

  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.filter((o) => value.includes(o.value))
  const remaining = options.filter((o) => !value.includes(o.value))
  const lower = query.trim().toLowerCase()
  const filtered = lower
    ? remaining.filter((o) => String(o.label).toLowerCase().includes(lower))
    : remaining
  const exactMatch = lower && options.some((o) => String(o.label).toLowerCase() === lower)
  const showCreate = allowCreate && Boolean(lower) && !exactMatch
  const optionCount = filtered.length + (showCreate ? 1 : 0)

  // Highlight in [0, optionCount-1] clampen.
  useEffect(() => {
    if (optionCount === 0) {
      if (highlightedIndex !== 0) setHighlightedIndex(0)
      return
    }
    if (highlightedIndex >= optionCount) setHighlightedIndex(optionCount - 1)
    if (highlightedIndex < 0) setHighlightedIndex(0)
  }, [optionCount, highlightedIndex])

  // Highlight zurück auf 0, sobald sich die Query ändert.
  useEffect(() => { setHighlightedIndex(0) }, [query])

  const activeDescendant = useMemo(() => {
    if (!open || optionCount === 0) return undefined
    if (highlightedIndex < filtered.length) return optionId(highlightedIndex)
    if (showCreate) return createId
    return undefined
    // optionId/createId leiten sich aus listboxId ab — dieser ist bereits Dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, optionCount, highlightedIndex, filtered.length, showCreate, listboxId])

  const add = (val) => {
    onChange?.([...value, val])
    setQuery('')
    setHighlightedIndex(0)
    inputEl()?.focus()
  }
  const remove = (val) => onChange?.(value.filter((v) => v !== val))

  const createAndAdd = () => {
    const name = query.trim()
    if (!name) return
    onCreate?.(name)
    setQuery('')
    setHighlightedIndex(0)
    inputEl()?.focus()
  }

  // Esc schließt das Dropdown und reicht den Fokus an den Aufrufer weiter.
  // stopPropagation hält den umschließenden Modal-Esc-Handler raus.
  const closeAndHandoff = () => {
    setOpen(false)
    setQuery('')
    setHighlightedIndex(0)
    inputEl()?.blur()
    if (typeof onEscape === 'function') onEscape()
  }

  // Markierte Option in den Viewport scrollen.
  useEffect(() => {
    if (!open) return
    const listbox = listboxRef.current
    if (!listbox) return
    const target = activeDescendant ? listbox.querySelector(`[id="${activeDescendant}"]`) : null
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' })
    }
  }, [activeDescendant, open])

  const commitHighlighted = () => {
    if (optionCount === 0) return
    if (highlightedIndex < filtered.length) {
      add(filtered[highlightedIndex].value)
      return
    }
    if (showCreate) createAndAdd()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeAndHandoff()
      return
    }
    if (e.key === 'ArrowDown') {
      if (!open) setOpen(true)
      if (optionCount === 0) { e.preventDefault(); return }
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % optionCount)
      return
    }
    if (e.key === 'ArrowUp') {
      if (!open) setOpen(true)
      if (optionCount === 0) { e.preventDefault(); return }
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + optionCount) % optionCount)
      return
    }
    if (e.key === 'Home' && open && optionCount > 0) {
      e.preventDefault()
      setHighlightedIndex(0)
      return
    }
    if (e.key === 'End' && open && optionCount > 0) {
      e.preventDefault()
      setHighlightedIndex(optionCount - 1)
      return
    }
    if (e.key === 'Enter') {
      if (!open || optionCount === 0) {
        if (allowCreate && query.trim() && !exactMatch) {
          e.preventDefault()
          createAndAdd()
        }
        return
      }
      e.preventDefault()
      commitHighlighted()
      return
    }
    if (e.key === 'Backspace' && !query && selected.length) {
      remove(selected[selected.length - 1].value)
    }
  }

  return (
    <div ref={wrapRef} data-ui="tag-multi-select" className={`relative ${className}`}>
      <div
        data-ui="tag-multi-select.control"
        className="rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text min-h-10 bg-[var(--surface0)]"
        onClick={() => { setOpen(true); inputEl()?.focus() }}
      >
        {selected.map((o) => (
          <Pill key={o.value} variant="outline" color={paletteFor(o.color)} className="gap-1">
            {o.label}
            <IconButton
              icon={<Icon name="close" inherit size={12} />}
              label={`${o.label} entfernen`}
              size="sm"
              variant="ghost"
              className="w-4 h-4 opacity-70 hover:opacity-100"
              data-ui={`tag-multi-select.remove.${o.value}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(o.value) }}
            />
          </Pill>
        ))}
        <Input
          surface="transparent"
          data-ui="tag-multi-select.input"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected.length ? '' : placeholder}
          className="flex-1 min-w-[80px] !w-auto !px-0 !py-0 !text-sm"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
        />
        {open && (
          <IconButton
            icon={<Icon name="close" inherit size={14} />}
            label="Auswahl schliessen"
            size="sm"
            variant="ghost"
            className="ml-auto w-6 h-6 opacity-70 hover:opacity-100"
            data-ui="tag-multi-select.close"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeAndHandoff() }}
          />
        )}
      </div>
      {open && (
        <ul
          ref={listboxRef}
          data-ui="tag-multi-select.list"
          id={listboxId}
          role="listbox"
          aria-label="Verfügbare Einträge"
          className="absolute z-30 mt-1 w-full rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto list-none p-0 m-0 bg-[var(--surface1)]"
        >
          {loading && (
            <li data-ui="tag-multi-select.loading" className="px-3 py-2 text-xs text-[var(--subtext0)]">Laden…</li>
          )}
          {!loading && filtered.length === 0 && !showCreate && (
            <li data-ui="tag-multi-select.empty" className="px-3 py-2 text-xs text-[var(--subtext0)]">
              {query ? noMatchHint : emptyHint}
            </li>
          )}
          {!loading && filtered.map((o, i) => {
            const isActive = highlightedIndex === i
            return (
              <li
                key={o.value}
                data-ui={`tag-multi-select.option.${o.value}`}
                data-testid={testIdPrefix ? `${testIdPrefix}${o.value}` : undefined}
                id={optionId(i)}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); add(o.value) }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer text-[var(--text)] ${isActive ? 'bg-[var(--surface2)]' : 'bg-transparent'}`}
              >
                <Pill variant="outline" color={paletteFor(o.color)}>{o.label}</Pill>
                {o.meta != null && (
                  <span data-ui="tag-multi-select.meta" className="text-xs ml-auto text-[var(--subtext0)]">{o.meta}</span>
                )}
              </li>
            )
          })}
          {showCreate && (
            <li
              data-ui="tag-multi-select.option.create"
              id={createId}
              role="option"
              aria-selected={highlightedIndex === filtered.length}
              onMouseDown={(e) => { e.preventDefault(); createAndAdd() }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              className={`w-full px-3 py-2 text-left text-sm border-t cursor-pointer text-[var(--accent-success)] border-[var(--surface0)] ${highlightedIndex === filtered.length ? 'bg-[var(--surface2)]' : 'bg-transparent'}`}
            >
              + „{query.trim()}“ anlegen
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
