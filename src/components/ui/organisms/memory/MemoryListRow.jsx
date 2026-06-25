import Badge from '../../atoms/Badge.jsx'

/**
 * MemoryListRow — Master-Listen-Zeile des MemoryBrowse-Screens (GF-433 T2, 06.15 Memory).
 * Zeigt category-Badge · anchor (D-Code, mono) · summary (truncate) · pinned-Marker · stability/date.
 * Präsentational, controlled (selected/onSelect). data-ui: memory-browse.list (Row-Wrapper).
 * Such-/Filter-Anker leben im Listen-Container (MemoryBrowse, T4), NICHT in der Row.
 */
const CATEGORY_BADGE = {
  architecture_decision: { label: 'Arch', tone: 'mauve' },
  convention: { label: 'Konvention', tone: 'blue' },
  external_constraint: { label: 'Constraint', tone: 'peach' },
  bug_pattern: { label: 'Bug', tone: 'red' },
  dead_end: { label: 'Dead-End', tone: 'yellow' },
  session_note: { label: 'Session', tone: 'neutral' },
}

export default function MemoryListRow({ memory, selected = false, onSelect }) {
  const cat = CATEGORY_BADGE[memory.category] || CATEGORY_BADGE.session_note
  const select = onSelect ? () => onSelect(memory.id) : undefined
  const handleKeyDown = select
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          select()
        }
      }
    : undefined
  return (
    <div
      role="button"
      tabIndex={0}
      data-ui="memory-browse.list"
      aria-pressed={selected}
      onClick={select}
      onKeyDown={handleKeyDown}
      className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left transition-colors ${
        selected ? 'bg-[var(--surface1)]' : 'bg-transparent hover:bg-[var(--state-hover)]'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge data-ui="memory-browse.list.category" tone={cat.tone} appearance="tint" size="sm">{cat.label}</Badge>
          {memory.anchor && (
            <span data-ui="memory-browse.list.anchor" className="font-mono text-xs text-[var(--accent-primary)]">{memory.anchor}</span>
          )}
          {memory.pinned ? <Badge tone="yellow" appearance="tint" size="sm">angeheftet</Badge> : null}
        </div>
        <p data-ui="memory-browse.list.summary" className="mt-0.5 truncate text-sm font-medium text-[var(--text)]">{memory.summary}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--subtext0)]">
          <span>{memory.stability}</span>
          {memory.updated_at && <span>· {String(memory.updated_at).slice(0, 10)}</span>}
        </div>
      </div>
    </div>
  )
}
