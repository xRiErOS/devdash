import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

/**
 * Select — Molecule (DD#61 Harvest aus components/ui/Select.jsx).
 * Trigger + Dropdown + optionales Suchfeld. Komponiert das Such-Input aus
 * ../atoms/Input.jsx und die Dropdown-Hülle aus ../atoms/PopoverPanel.jsx.
 * Props-driven (options/value/onChange), kein Store/Fetch, keine Domänen-Begriffe.
 * Token-clean: 0 inline-style, 0 Raw-Hex.
 *
 * @param {object} props
 * @param {string|number|null} props.value - aktuell ausgewaehlter value
 * @param {Array<{value, label, hint?}>} props.options
 * @param {(value) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {boolean} [props.searchable] - explicit force; sonst auto bei >=8 Optionen
 * @param {boolean} [props.disabled]
 * @param {'sm'|'md'|'lg'} [props.size] - 'sm' (32px) | 'md' (36px, default) | 'lg' (44px)
 * @param {string} [props.ariaLabel]
 * @param {string} [props.className]
 * @param {boolean} [props.prominent] - hervorgehobene (warning-getönte) Border.
 * @param {boolean} [props.wrap] - lange Labels umbrechen statt truncaten.
 * @param {boolean} [props.portal] - DD-Review F4: Dropdown als fixed-Portal (document.body)
 *   statt absolute rendern. Nötig, wenn der Select in einem overflow:auto/hidden-Container
 *   liegt (z.B. FilterPopover-Body) — sonst clippt der Container das Dropdown. Mirror DD-672.
 * @param {string} [props['data-ui']] - DD-568: überschreibt den Trigger-Anker
 *   (Default 'select.trigger'), sodass der fachliche Filter-Anker am echten
 *   Control-DOM-Element sitzt statt am Wrapper. Weitere DOM-Props (...rest)
 *   werden ans Trigger-Element durchgereicht.
 */

const SIZE_MIN_H = {
  sm: 'min-h-8',
  md: 'min-h-9',
  lg: 'min-h-11',
}

export default function Select({
  value,
  options = [],
  onChange,
  placeholder = 'Auswählen…',
  searchable,
  disabled = false,
  size = 'md',
  ariaLabel,
  className = '',
  prominent = false,
  wrap = false,
  portal = false,
  'data-ui': dataUi,
  ...rest
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const useSearch = searchable ?? options.length >= 8
  const minHClass = SIZE_MIN_H[size] || SIZE_MIN_H.md

  const filtered = useMemo(() => {
    if (!useSearch || !query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
  }, [options, query, useSearch])

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const onClick = e => {
      if (triggerRef.current?.contains(e.target)) return
      if (listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  useEffect(() => {
    if (open && useSearch) inputRef.current?.focus()
  }, [open, useSearch])

  useEffect(() => {
    if (!open) { setQuery(''); setActiveIdx(0) }
  }, [open])

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIdx]
      if (opt) { onChange?.(opt.value); setOpen(false); triggerRef.current?.focus() }
    }
  }

  const triggerBg = prominent ? 'bg-[var(--surface1)]' : 'bg-[var(--surface0)]'
  const triggerText = selected
    ? 'text-[var(--text)]'
    : prominent ? 'text-[var(--subtext0)]' : 'text-[var(--subtext1)]'
  const triggerBorder = prominent
    ? (selected ? 'border border-[var(--surface2)]' : 'border border-[var(--accent-warning)]')
    : 'border border-transparent'

  return (
    <div data-ui="select" className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        data-ui={dataUi ?? 'select.trigger'}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        {...rest}
        className={`w-full flex items-center gap-2 px-3 rounded-lg outline-none text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${minHClass} ${triggerBg} ${triggerText} ${triggerBorder}`}
      >
        <span data-ui="select.value" className="flex-1 min-w-0 truncate text-left">
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          data-ui="select.chevron"
          size={14}
          className={`shrink-0 transition-transform duration-100 ${prominent ? 'text-[var(--accent-warning)]' : 'text-[var(--subtext1)]'} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <PopoverPanel
          role="listbox"
          portal={portal}
          anchorRef={triggerRef}
          panelRef={(el) => { listRef.current = el }}
          className={`${portal ? 'min-w-[12rem]' : 'w-full'} max-h-56 overflow-hidden shadow-[0_16px_48px_color-mix(in_srgb,var(--crust)_55%,transparent)] ${prominent ? 'border-2 border-[var(--accent-warning)]' : ''}`}
        >
          {useSearch && (
            <div data-ui="select.search" className="px-2 py-2 border-b border-[var(--surface0)]">
              <Input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
                placeholder="Suchen…"
                className="text-sm py-1.5"
                leadingIcon={<Search size={12} className="text-[var(--subtext1)]" />}
              />
            </div>
          )}
          <div data-ui="select.list" className="overflow-y-auto max-h-44">
            {filtered.length === 0 ? (
              <p data-ui="select.empty" className="px-3 py-3 text-sm text-center text-[var(--subtext1)]">
                Kein Treffer
              </p>
            ) : filtered.map((opt, idx) => {
              const isActive = idx === activeIdx
              const isSelected = opt.value === value
              return (
                <button
                  key={String(opt.value)}
                  data-ui={`select.option.${opt.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => { onChange?.(opt.value); setOpen(false); triggerRef.current?.focus() }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] ${isActive ? 'bg-[var(--surface0)]' : 'bg-transparent'}`}
                >
                  <span data-ui="select.label" className={`flex-1 min-w-0 ${wrap ? 'whitespace-normal break-words' : 'truncate'}`}>{opt.label}</span>
                  {opt.hint && (
                    <span data-ui="select.hint" className="text-[11px] font-mono shrink-0 text-[var(--subtext1)]">{opt.hint}</span>
                  )}
                  {isSelected && <Check data-ui="select.option.check" size={14} className="text-[var(--accent-success)]" />}
                </button>
              )
            })}
          </div>
        </PopoverPanel>
      )}
    </div>
  )
}
