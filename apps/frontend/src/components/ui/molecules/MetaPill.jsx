import { useState, useEffect, useRef } from 'react'
import PopoverPanel from '../atoms/PopoverPanel'

/**
 * MetaPill — kanonische, token-saubere Variante (DD-56 Harvest).
 * Inline-Edit-Pill: Button zeigt den aktuellen Wert, Klick öffnet eine
 * Optionsliste (delegiert die Floating-Optik an PopoverPanel). Outside-Click
 * schließt das Dropdown. Props-driven, kein Store/Fetch, generische Begriffe.
 *
 * @param {object} props
 * @param {string} props.label - Feld-Label (für Title/data-ui-Scope)
 * @param {string|number} props.value - aktuell gewählter Wert
 * @param {Array<{value: string|number, label: import('react').ReactNode}>} props.options - Auswahlliste
 * @param {(value: string|number) => void} props.onChange - Callback bei Auswahl
 * @param {'primary'|'info'|'neutral'} [props.palette='neutral'] - Akzentfarbe des Triggers
 * @param {string} [props.dataUiScope='meta-pill'] - data-ui-Wurzelbereich (I04: parametrisiert;
 *   Konsument setzt z.B. 'issue-detail.meta-pill.Priorität' → Trigger/Optionen erben den Scope)
 */

// Statische Token-Maps (Tailwind-JIT muss die Klassen literal sehen).
// DesignStudie D02b: text-tragender Fill bei surface0 gedeckelt (surface1 = 4.39 <
// AA 4.5 in Light). Lift über --border-elevated-Kante (≥3:1), nicht über surface1.
// info-Pill bleibt Akzent (on-accent ist auf Kontrast ausgelegt).
const PALETTE_MAP = {
  primary: 'bg-[var(--surface0)] text-[var(--text)] border border-[var(--border-elevated)]',
  info: 'bg-[var(--accent-info)] text-[var(--on-accent)]',
  neutral: 'bg-[var(--surface0)] text-[var(--text)] border border-[var(--border-elevated)]',
}

export default function MetaPill({ label, value, options, onChange, palette = 'neutral', dataUiScope = 'meta-pill' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const display = options.find(o => String(o.value) === String(value))?.label ?? value
  const paletteClass = PALETTE_MAP[palette] || PALETTE_MAP.neutral

  return (
    <div data-ui={dataUiScope} className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        data-ui={`${dataUiScope}.trigger`}
        title={`${label} ändern`}
        className={`text-[11px] px-1.5 py-0.5 rounded font-mono hover:opacity-80 ${paletteClass}`}
      >
        {display}
      </button>
      {open && (
        <PopoverPanel align="left" className="min-w-[160px] max-h-[320px] overflow-y-auto">
          {options.map(o => (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              data-ui={`${dataUiScope}.option.${o.value}`}
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--state-hover)]"
            >
              {o.label}
            </button>
          ))}
        </PopoverPanel>
      )}
    </div>
  )
}
