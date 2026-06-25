import { useEffect, useRef, useState } from 'react'
import { Filter } from 'lucide-react'
import IconButton from '../../atoms/IconButton.jsx'
import PopoverPanel from '../../atoms/PopoverPanel.jsx'
import Select from '../../molecules/Select.jsx'
import SegmentedControl from '../../molecules/SegmentedControl.jsx'

/**
 * MemoryListFilter — Filter-Achsen der Memory-Liste (GF-433 T4, 06.15 Memory) hinter EINEM
 * ghost-IconButton (Filter-Icon); Klick öffnet Popover mit category · stability · importance · pinned.
 * Präsentational, controlled. data-ui: memory-browse.list.filter (Wurzel) · .trigger.
 */
const CATEGORY_OPTIONS = [
  { value: '', label: 'Alle Kategorien' },
  { value: 'architecture_decision', label: 'Architektur-Entscheidung' },
  { value: 'convention', label: 'Konvention' },
  { value: 'external_constraint', label: 'Externer Constraint' },
  { value: 'bug_pattern', label: 'Bug-Pattern' },
  { value: 'dead_end', label: 'Dead-End' },
  { value: 'session_note', label: 'Session-Note' },
]
const STABILITY_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'stable', label: 'Stable' },
  { value: 'volatile', label: 'Volatile' },
]
const IMPORTANCE_OPTIONS = [
  { value: '', label: 'Alle Stufen' },
  { value: '1', label: 'Hoch' },
  { value: '2', label: 'Normal' },
  { value: '3', label: 'Niedrig' },
]
const PINNED_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'pinned', label: 'Nur angeheftet' },
]

export default function MemoryListFilter({
  category = '',
  onCategory,
  stability = '',
  onStability,
  importance = '',
  onImportance,
  pinned = 'all',
  onPinned,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const panelNodeRef = useRef(null)
  const active = (category ? 1 : 0) + (stability ? 1 : 0) + (importance ? 1 : 0) + (pinned !== 'all' ? 1 : 0)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      const inTrigger = ref.current && ref.current.contains(e.target)
      const inPanel = panelNodeRef.current && panelNodeRef.current.contains(e.target)
      if (!inTrigger && !inPanel) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} data-ui="memory-browse.list.filter" className="relative">
      <IconButton
        data-ui="memory-browse.list.filter.trigger"
        icon={<Filter size={16} aria-hidden="true" />}
        label={active ? `Filtern (${active} aktiv)` : 'Filtern'}
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
          aria-label="Filtern"
          className="w-72"
          portal
          anchorRef={ref}
          panelRef={(el) => {
            panelNodeRef.current = el
          }}
        >
          <div data-ui="memory-browse.list.filter.body" className="space-y-3 p-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Kategorie</label>
              <Select data-ui="memory-browse.list.category" options={CATEGORY_OPTIONS} value={category} onChange={onCategory} aria-label="Kategorie" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Stabilität</label>
              <SegmentedControl ariaLabel="Stabilität" options={STABILITY_OPTIONS} value={stability} onChange={onStability} size="sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Wichtigkeit</label>
              <Select data-ui="memory-browse.list.importance" options={IMPORTANCE_OPTIONS} value={importance} onChange={onImportance} aria-label="Wichtigkeit" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">Angeheftet</label>
              <SegmentedControl ariaLabel="Angeheftet" options={PINNED_OPTIONS} value={pinned} onChange={onPinned} size="sm" />
            </div>
          </div>
        </PopoverPanel>
      )}
    </div>
  )
}
