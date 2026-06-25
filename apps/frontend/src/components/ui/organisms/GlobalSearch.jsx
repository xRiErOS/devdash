import { useEffect, useMemo, useState } from 'react'
import { Search, Flag, CalendarRange, CircleDot } from 'lucide-react'
import Input from '../atoms/Input.jsx'

// f-Shortcut + Blur greifen das Input-Element über seinen stabilen data-ui-Anker
// (Input-Atom ist nicht forwardRef-fähig).
export const GLOBAL_SEARCH_INPUT_SELECTOR = '[data-ui="app-shell.global-search.input"]'
const blurInput = () => document.querySelector(GLOBAL_SEARCH_INPUT_SELECTOR)?.blur()

/**
 * GlobalSearch — AppShell-Organismus (DD-496, REQ-19, FEAT-09).
 * Cross-Entity-Suche über Meilensteine, Sprints und Issues des aktiven Projekts.
 * Presentational + UI-State (Open/active-Index) — KEIN fetch/router. Datenbeschaffung
 * + Navigation liegen im Layout-Container (client-seitige Aggregation, PO-D DD74-D05).
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex (Farben via Tailwind-v4-Arbitrary-Tokens).
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(v:string)=>void} props.onChange
 * @param {Array<{type:'milestone'|'sprint'|'issue', id:number|string, key?:string, title:string}>} [props.results]
 * @param {(r:object)=>void} props.onSelect
 * @param {string} [props.placeholder]
 * @param {object} [props.inputRef] - optionaler Ref auf das Input-Element (f-Fokus)
 */

export const TYPE_META = {
  milestone: { label: 'Meilensteine', Icon: Flag },
  sprint: { label: 'Sprints', Icon: CalendarRange },
  issue: { label: 'Issues', Icon: CircleDot },
}
export const ORDER = ['milestone', 'sprint', 'issue']

/**
 * groupResultsByType — fixe Typ-Gruppierung (Meilenstein→Sprint→Issue) + flache
 * Liste für Pfeiltasten-Navigation. Single Source der Such-Aggregation; die
 * Command-Palette (DD-634) projiziert dieselbe Logik (rel.command-palette.uses
 * .global-search). Leere Gruppen entfallen; jede Gruppe trägt label + Icon.
 *
 * @param {Array<{type:'milestone'|'sprint'|'issue', id:number|string, key?:string, title:string}>} results
 * @returns {{groups: Array<{type:string,label:string,Icon:any,items:object[]}>, flat: object[]}}
 */
export function groupResultsByType(results = []) {
  const byType = { milestone: [], sprint: [], issue: [] }
  for (const r of results) if (byType[r.type]) byType[r.type].push(r)
  const groups = ORDER.filter((t) => byType[t].length > 0).map((t) => ({
    type: t,
    label: TYPE_META[t].label,
    Icon: TYPE_META[t].Icon,
    items: byType[t],
  }))
  const flat = groups.flatMap((g) => g.items)
  return { groups, flat }
}

export default function GlobalSearch({
  value = '',
  onChange,
  results = [],
  onSelect,
  placeholder = 'Meilensteine, Sprints, Issues durchsuchen…',
  open: openProp,
}) {
  const [openState, setOpenState] = useState(false)
  // Controlled/uncontrolled: `open`-Prop überschreibt den Fokus-getriebenen State
  // (für Storybook-States + Tests). Ohne Prop steuert Fokus/Blur das Panel.
  const open = openProp !== undefined ? openProp : openState
  const setOpen = openProp !== undefined ? () => {} : setOpenState
  const [activeIdx, setActiveIdx] = useState(0)

  const hasQuery = value.trim().length > 0

  // Gruppieren nach Typ in fixer Reihenfolge; flache Liste für Pfeiltasten-Navigation.
  const { groups, flat } = useMemo(() => groupResultsByType(results), [results])

  useEffect(() => { setActiveIdx(0) }, [value])

  const showPanel = open && hasQuery
  const showEmpty = showPanel && flat.length === 0

  const choose = (r) => {
    if (!r) return
    onSelect?.(r)
    setOpen(false)
    blurInput()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flat.length) { setOpen(true); setActiveIdx(i => Math.min(i + 1, flat.length - 1)) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (showPanel && flat[activeIdx]) { e.preventDefault(); choose(flat[activeIdx]) }
    } else if (e.key === 'Escape') {
      if (hasQuery) { e.preventDefault(); onChange?.(''); setOpen(false); blurInput() }
    }
  }

  return (
    <div className="relative w-full" data-ui="app-shell.global-search">
      <Input
        type="search"
        value={value}
        onChange={e => { onChange?.(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Globale Suche"
        role="combobox"
        aria-expanded={showPanel}
        leadingIcon={<Search size={14} />}
        className="py-1.5 text-sm"
        data-ui="app-shell.global-search.input"
      />
      {showPanel && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-40 max-h-80 overflow-y-auto rounded-lg border border-[var(--surface1)] bg-[var(--mantle)] shadow-2xl"
          role="listbox"
          // onMouseDown preventDefault: Klick darf das Input nicht vorzeitig blurren.
          onMouseDown={e => e.preventDefault()}
          data-ui="app-shell.global-search.results"
        >
          {showEmpty ? (
            <div className="px-3 py-3 text-sm text-[var(--subtext0)]" data-ui="app-shell.global-search.empty">
              Keine Treffer für „{value.trim()}“
            </div>
          ) : (
            groups.map(group => {
              const { label, Icon } = TYPE_META[group.type]
              return (
                <div key={group.type} data-ui={`app-shell.global-search.group.${group.type}`}>
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--subtext0)]">
                    {label}
                  </div>
                  {group.items.map(item => {
                    const idx = flat.indexOf(item)
                    const active = idx === activeIdx
                    return (
                      <button
                        key={`${group.type}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => choose(item)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--text)] ${active ? 'bg-[var(--surface0)]' : ''}`}
                        data-ui={`app-shell.global-search.result.${group.type}.${item.id}`}
                      >
                        <Icon size={14} className="shrink-0 text-[var(--subtext0)]" />
                        {item.key && (
                          <span className="shrink-0 font-mono text-xs text-[var(--subtext1)]">{item.key}</span>
                        )}
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
