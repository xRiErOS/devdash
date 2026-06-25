import { useEffect, useRef, useState } from 'react'
import Icon from '../../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import PopoverPanel from '../../atoms/PopoverPanel.jsx'
import Select from '../../molecules/Select.jsx'
import SegmentedControl from '../../molecules/SegmentedControl.jsx'

/**
 * ReviewListFilter — fasst Sortierung + Runden-Filter der Review-Liste hinter EINEN
 * ghost-IconButton (Filter-Icon, PO-Runde-3); Klick öffnet ein Popover-Menü mit
 * Sort-Auswahl + Filter-Umschalter. Präsentational, controlled.
 *
 * data-ui: review-list-filter (Wurzel) · .trigger (Icon-Button) · review-list-filter.sort (Select).
 */
const SORT_OPTIONS = [
  { value: 'asc', label: 'Offen zuerst' },
  { value: 'desc', label: 'Abgenommen zuerst' },
]
const FILTER_OPTIONS = [
  { value: 'open', label: 'Offen/Abgelehnt' },
  { value: 'all', label: 'Alle' },
]

export default function ReviewListFilter({ sortDir = 'asc', onSortDir, filter = 'open', onFilter }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const panelNodeRef = useRef(null)
  const active = (sortDir !== 'asc' ? 1 : 0) + (filter !== 'open' ? 1 : 0)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      const inTrigger = ref.current && ref.current.contains(e.target)
      const inPanel = panelNodeRef.current && panelNodeRef.current.contains(e.target)
      if (!inTrigger && !inPanel) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} data-ui="review-list-filter" className="relative">
      <IconButton
        data-ui="review-list-filter.trigger"
        icon={<Icon name="filter" size={16} />}
        label={active ? `Sortieren & Filtern (${active} aktiv)` : 'Sortieren & Filtern'}
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <PopoverPanel
          align="right"
          role="dialog"
          aria-label="Sortieren & Filtern"
          className="w-72"
          portal
          anchorRef={ref}
          panelRef={(el) => { panelNodeRef.current = el }}
        >
          <div data-ui="review-list-filter.body" className="space-y-3 p-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Sortierung</label>
              <Select
                data-ui="review-list-filter.sort"
                options={SORT_OPTIONS}
                value={sortDir}
                onChange={onSortDir}
                aria-label="Sortierung"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Runden-Filter</label>
              <SegmentedControl
                ariaLabel="Runden-Filter"
                options={FILTER_OPTIONS}
                value={filter}
                onChange={onFilter}
                size="sm"
              />
            </div>
          </div>
        </PopoverPanel>
      )}
    </div>
  )
}
