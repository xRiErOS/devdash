import { useEffect, useMemo, useState } from 'react'
import { Search, X, ArrowUpDown, CornerDownLeft } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import { groupResultsByType } from './GlobalSearch.jsx'

/**
 * CommandPalette — AppShell-Organismus (DD-634, F2, FEAT-24).
 * Die EINZIGE Such-/Sprung-Surface (D02): zentriertes ⌘K-Overlay am Desktop,
 * Vollbild-Such-Sheet auf Mobile — eine responsive Surface (Breakpoint via CSS,
 * lg). Löst die Inline-Header-Suche (DD-533) ab und projiziert die globale Such-
 * Aggregation (rel.command-palette.uses.global-search → groupResultsByType).
 *
 * Presentational + UI-State (open/active-Index/Kategorie). Datenbeschaffung +
 * Navigation liegen im Layout-Container (CommandPaletteContainer).
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex (Farben via Tailwind-v4-Arbitrary-Tokens).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.value
 * @param {(v:string)=>void} props.onChange
 * @param {Array<{type:'milestone'|'sprint'|'issue', id:number|string, key?:string, num?:number, title:string, status?:string}>} [props.results]
 * @param {(r:object)=>void} props.onSelect
 * @param {string} [props.placeholder]
 */

export { groupResultsByType }

// Kategorie-Chips: filtern die Treffer vor der Gruppierung. 'Alle' = kein Filter.
export const PALETTE_CHIPS = ['Alle', 'Milestones', 'Sprints', 'Issues']
const CHIP_TO_TYPE = { Alle: null, Milestones: 'milestone', Sprints: 'sprint', Issues: 'issue' }

export default function CommandPalette({
  open,
  onClose,
  value = '',
  onChange,
  results = [],
  onSelect,
  placeholder = 'Springe zu Issue, Sprint, Meilenstein… (⌘K)',
}) {
  const [category, setCategory] = useState('Alle')
  const [activeIdx, setActiveIdx] = useState(0)

  const filtered = useMemo(() => {
    const t = CHIP_TO_TYPE[category]
    return t ? results.filter((r) => r.type === t) : results
  }, [results, category])

  const { groups, flat } = useMemo(() => groupResultsByType(filtered), [filtered])

  const hasQuery = value.trim().length > 0
  const showResults = hasQuery
  const showEmpty = showResults && flat.length === 0

  // Aktiven Index zurücksetzen, wenn sich Query oder Kategorie ändern.
  useEffect(() => { setActiveIdx(0) }, [value, category])

  const choose = (r) => {
    if (!r) return
    onSelect?.(r)
    onClose?.()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flat.length) setActiveIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (showResults && flat[activeIdx]) { e.preventDefault(); choose(flat[activeIdx]) }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose?.()
    }
  }

  if (!open) return null

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        data-ui="app-shell.command-palette.scrim"
        className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--crust)_55%,transparent)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command-Palette"
        data-ui="app-shell.command-palette.sheet"
        className="fixed inset-0 z-50 flex flex-col bg-[var(--base)] lg:inset-auto lg:left-1/2 lg:top-20 lg:-translate-x-1/2 lg:w-[34rem] lg:max-w-[88%] lg:max-h-[70vh] lg:overflow-hidden lg:rounded-lg lg:border lg:border-[var(--surface1)] lg:bg-[var(--mantle)] lg:shadow-2xl"
      >
        {/* Grabber: nur Mobile (Swipe-Dismiss-Affordanz). */}
        <span
          aria-hidden
          data-ui="app-shell.command-palette.grabber"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--surface2)] lg:hidden"
        />
        {/* Input + Mobile-Schließen (≥44px Touch-Target). */}
        <div
          className="flex shrink-0 items-center gap-2 border-b border-[var(--surface0)] p-2"
          data-ui="app-shell.command-palette.open"
        >
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label="Command-Palette Suche"
              role="combobox"
              aria-expanded={showResults}
              autoFocus
              leadingIcon={<Search size={16} />}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Suche schließen"
            title="Schließen (esc)"
            data-ui="app-shell.command-palette.close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--subtext0)] transition-colors hover:bg-[var(--surface0)] lg:hidden"
          >
            <X size={22} />
          </button>
        </div>
        {/* Kategorie-Chips. */}
        <div
          className="flex shrink-0 flex-wrap gap-1.5 border-b border-[var(--surface0)] px-2 py-2"
          data-ui="app-shell.command-palette.chips"
        >
          {PALETTE_CHIPS.map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] text-[var(--accent-primary)]'
                    : 'border-[var(--surface1)] text-[var(--subtext0)] hover:bg-[var(--surface0)]'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
        {/* Treffer (Pfeiltasten-Nav: onMouseDown preventDefault hält Input-Fokus). */}
        <div
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="min-h-0 flex-1 overflow-auto p-1"
          data-ui="app-shell.command-palette.results"
        >
          {!showResults ? (
            <div className="px-3 py-3 text-sm text-[var(--subtext0)]" data-ui="app-shell.command-palette.hint">
              Tippe, um Meilensteine, Sprints und Issues zu durchsuchen.
            </div>
          ) : showEmpty ? (
            <div className="px-3 py-3 text-sm text-[var(--subtext0)]" data-ui="app-shell.command-palette.empty">
              Keine Treffer für „{value.trim()}“
            </div>
          ) : (
            groups.map((group) => {
              const { Icon } = group
              return (
                <div key={group.type} data-ui={`app-shell.command-palette.group.${group.type}`}>
                  <span className="block px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--subtext0)]">
                    {group.label}
                  </span>
                  {group.items.map((item) => {
                    const idx = flat.indexOf(item)
                    const active = idx === activeIdx
                    const anchor = item.key ?? item.id
                    return (
                      <button
                        key={`${group.type}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => choose(item)}
                        className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-2 text-left ${active ? 'bg-[var(--surface0)]' : ''}`}
                        data-ui={`app-shell.command-palette.result.${anchor}`}
                      >
                        <Icon size={16} className="shrink-0 text-[var(--subtext0)]" />
                        {item.key && (
                          <span className="shrink-0 font-mono text-xs text-[var(--subtext1)]">{item.key}</span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">{item.title}</span>
                        {item.status && <StatusBadge status={item.status} />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
        {/* Tastatur-Hint-Footer: nur Desktop. */}
        <div
          className="hidden shrink-0 items-center gap-4 border-t border-[var(--surface0)] px-3 py-2 text-xs text-[var(--subtext0)] lg:flex"
          data-ui="app-shell.command-palette.footer"
        >
          <span className="inline-flex items-center gap-1"><ArrowUpDown size={12} /> Navigieren</span>
          <span className="inline-flex items-center gap-1"><CornerDownLeft size={12} /> Öffnen</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[var(--surface1)] bg-[var(--surface0)] px-1 font-mono">esc</kbd> Schließen
          </span>
        </div>
      </div>
    </>
  )
}
