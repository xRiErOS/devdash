import { useEffect, useRef, useState } from 'react'
import { Filter, X as XIcon } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import IconButton from '../atoms/IconButton.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'

/**
 * FilterPopover — Molecule (DD#61 Harvest aus ui/FilterPopover.jsx, DD-529 wired).
 * Komponiert Button (Trigger) + PopoverPanel (Slot-Hülle) zu einem
 * Filter-Trigger mit aktivem-Filter-Counter und beliebigem children-Slot.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {number} [props.activeCount=0] - Zahl im Counter; 0 zeigt nur Filter-Icon
 * @param {string} [props.label='Filter']
 * @param {() => void} [props.onClear] - "Zuruecksetzen"-Button im Popover-Footer
 * @param {'left'|'right'} [props.align='left'] - Panel-Kante zum Anker
 * @param {string} [props.dataUi='filter-popover'] - parametrisierter data-ui-Wurzelbereich (DD-529/D01)
 * @param {boolean} [props.portal=false] - DD-672 (r3): Panel als fixed-Portal rendern (Clip-Escape in overflow:auto-Spalten)
 * @param {React.ReactNode} props.children - Filter-Inhalte
 * @param {string} [props.className]
 */
export default function FilterPopover({
  activeCount = 0,
  label = 'Filter',
  onClear,
  align = 'left',
  dataUi = 'filter-popover',
  portal = false,
  // GF-PO 2026-06-24: Body kann vertikal (Default, gestapelt) oder horizontal
  // (umbrechend nebeneinander) komponiert werden.
  orientation = 'vertical',
  children,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  // DD-672 (r3): im Portal-Modus liegt das Panel ausserhalb von `ref` (in body) —
  // der Outside-Click muss es separat ausnehmen, sonst schliesst ein Klick ins
  // Panel sofort.
  const panelNodeRef = useRef(null)

  useEffect(() => {
    const onClick = e => {
      const inTrigger = ref.current && ref.current.contains(e.target)
      const inPanel = panelNodeRef.current && panelNodeRef.current.contains(e.target)
      if (!inTrigger && !inPanel) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = activeCount > 0

  return (
    <div ref={ref} data-ui={dataUi} className={`relative ${className}`}>
      {/* DD-Review (T01, memory-browse-Parität): Trigger = ghost-IconButton (icon-only),
          analog memory-browse.list.filter.trigger. Aktiv-Count wandert ins aria-Label
          (kein sichtbares Badge mehr); aktiver Filter wird über Accent-Tint am Icon
          sichtbar gemacht (token-clean, ghost bleibt erhalten). */}
      <IconButton
        data-ui={`${dataUi}.trigger`}
        icon={<Filter size={16} aria-hidden />}
        label={active ? `${label} (${activeCount} aktiv)` : label}
        variant="ghost"
        size="sm"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={active ? 'text-[var(--accent-info)] [&_svg]:text-[var(--accent-info)]' : ''}
      />

      {open && (
        <PopoverPanel
          align={align}
          role="dialog"
          aria-label={label}
          className="w-80"
          portal={portal}
          anchorRef={ref}
          panelRef={(el) => { panelNodeRef.current = el }}
        >
          <div
            data-ui={`${dataUi}.body`}
            className={`p-4 max-h-[60vh] overflow-y-auto ${orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}`}
          >
            {children}
          </div>
          {onClear && active && (
            <div data-ui={`${dataUi}.footer`} className="flex items-center justify-between px-3 py-2 border-t border-[var(--surface0)]">
              <Button
                variant="ghost"
                size="sm"
                data-ui={`${dataUi}.action`}
                leadingIcon={<XIcon size={12} aria-hidden />}
                onClick={() => { onClear(); setOpen(false) }}
                className="text-[var(--accent-danger)]"
              >
                Zuruecksetzen
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Schliessen
              </Button>
            </div>
          )}
        </PopoverPanel>
      )}
    </div>
  )
}
