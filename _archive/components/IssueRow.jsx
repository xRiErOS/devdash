import { GripVertical } from 'lucide-react'
import StatusPicker from './StatusPicker.jsx'
import { TagChip } from './TagMultiSelect.jsx'
import { TypeIcon } from './ui/atoms/typeIcons.jsx'
import { displayId } from '../lib/displayId.js'
import { highlight } from '../lib/highlight.js'

// Pattern P01: kompakte Issue-Zeile. Layout-Huelle aus BacklogPage (DD-137)
// extrahiert fuer Wiederverwendung im Sprint-Board (Plan 04 Task 4).
// Bewusst KEIN Cluster-Primitive: die Zeile darf nicht umbrechen — alle
// Pflichtfelder bleiben einzeilig sichtbar (DD-137). Verhalten 1:1 zum Inline-
// Original; D&D-Wiring kommt unveraendert ueber dragHandleProps vom DraggableRow.
export default function IssueRow({
  item,
  search = '',
  isLast = false,
  multiSelected = false,
  dragHandleProps = {},
  onOpen,
  onToggleMulti,
  onStatusChange,
  refineSlot = null,
}) {
  const tags = item.tags || []
  return (
    <div
      data-testid={`backlog-row-${item.id}`}
      data-ui={`backlog.list.item.${item.id}`}
      className="flex items-center gap-2 pr-2 py-1"
      style={{
        borderLeft: `4px solid var(--priority-${item.priority})`,
        paddingLeft: '4px',
        borderBottom: isLast ? 'none' : '1px solid var(--surface0)',
        background: multiSelected
          ? 'color-mix(in srgb, var(--accent-info) 18%, transparent)'
          : 'transparent',
        minHeight: '34px',
      }}
    >
      <button
        type="button"
        data-ui={`backlog.list.item.${item.id}.drag-handle`}
        {...dragHandleProps}
        aria-label="Issue verschieben"
        title="Issue auf Sprint-Chip ziehen"
        className="shrink-0 cursor-grab"
        style={{ color: 'var(--hint)', touchAction: 'none' }}
      >
        <GripVertical size={14} />
      </button>
      <span className="text-[10px] font-mono shrink-0 w-[52px]" style={{ color: 'var(--hint)' }}>
        {displayId(item)}
      </span>
      <button
        type="button"
        data-ui={`backlog.list.item.${item.id}.open`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) { onToggleMulti?.(item.id); return }
          onOpen?.(item.id)
        }}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        title={`P${item.priority} · ${item.type} (Cmd/Ctrl+Klick = mehrfach)`}
      >
        <TypeIcon type={item.type} size={14} />
        <span className="text-sm truncate">{highlight(item.title, search)}</span>
        {tags.slice(0, 3).map(t => <TagChip key={t.id} tag={t} small />)}
      </button>
      {/* DD-252: Inline-Status-Picker — StatusPicker delegiert bei nicht-
          interaktivem Static-Mode an StatusBadge. */}
      <StatusPicker
        status={item.status}
        slug={`backlog.row.${item.id}.status`}
        onChange={onStatusChange}
      />
      {/* DD-157 R2: AI-Refine-Slot — Parent liefert den Button nur bei status=new. */}
      {refineSlot}
    </div>
  )
}
