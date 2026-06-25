import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

/**
 * SplitButton — Molecule (DD-529). Primär-Aktion (Klick auf den linken Teil) +
 * Caret (rechter Teil), der ein PopoverPanel mit Sekundär-Aktionen öffnet.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe. Token-sauber
 * (kein inline-style, kein Roh-Hex).
 *
 * @param {object} props
 * @param {string} props.primaryLabel - Label der Primär-Aktion
 * @param {() => void} props.onPrimary - Klick auf den Primär-Teil
 * @param {React.ReactNode} [props.primaryIcon] - Icon links der Primär-Aktion
 * @param {string} [props.primaryTitle] - title/Tooltip der Primär-Aktion
 * @param {Array<{label:string, onClick:()=>void, icon?:React.ReactNode, title?:string}>} props.items - Dropdown-Aktionen
 * @param {string} [props.menuLabel='Weitere Aktionen'] - aria-label des Caret
 * @param {boolean} [props.menuOnly=false] - EIN Button (Label + Caret) der nur das Menü öffnet, kein Primär-Default (z.B. „Neu erstellen" → Auswahl)
 * @param {'left'|'right'} [props.align='left'] - Panel-Kante zum Anker
 * @param {string} [props.dataUi='split-button'] - parametrisierter data-ui-Wurzelbereich
 * @param {string} [props.className]
 */
export default function SplitButton({
  primaryLabel,
  onPrimary,
  primaryIcon,
  primaryTitle,
  items = [],
  menuLabel = 'Weitere Aktionen',
  menuOnly = false,
  align = 'left',
  dataUi = 'split-button',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleItem = (it) => {
    setOpen(false)
    it.onClick?.()
  }

  return (
    <div ref={ref} data-ui={dataUi} className={`relative inline-flex ${className}`}>
      {menuOnly ? (
        <button
          type="button"
          data-ui={`${dataUi}.trigger`}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          title={primaryTitle || menuLabel}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] bg-[var(--accent-info)] text-[var(--on-accent)]"
        >
          {primaryIcon}
          {primaryLabel}
          <ChevronDown size={14} aria-hidden className="opacity-80" />
        </button>
      ) : (
        <div className="inline-flex">
          <button
            type="button"
            data-ui={`${dataUi}.primary`}
            onClick={onPrimary}
            title={primaryTitle}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-l-lg text-xs font-medium min-h-[36px] bg-[var(--accent-info)] text-[var(--on-accent)]"
          >
            {primaryIcon}
            {primaryLabel}
          </button>
          <button
            type="button"
            data-ui={`${dataUi}.caret`}
            onClick={() => setOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={menuLabel}
            title={menuLabel}
            className="inline-flex items-center px-1.5 min-h-[36px] rounded-r-lg border-l border-[color-mix(in_srgb,var(--on-accent)_30%,transparent)] bg-[var(--accent-info)] text-[var(--on-accent)]"
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>
      )}
      {open && (
        <PopoverPanel align={align} data-ui={`${dataUi}.panel`} className="min-w-[200px] py-1">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              data-ui={`${dataUi}.item`}
              onClick={() => handleItem(it)}
              title={it.title}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--surface0)]"
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </PopoverPanel>
      )}
    </div>
  )
}
