import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import StatusBadge from '../ui/atoms/StatusBadge.jsx'
import StatusPicker from '../StatusPicker.jsx'
import { patchIssueStatus } from '../../lib/issueStatusApi.js'
import SprintActions from '../SprintActions.jsx'
import Tooltip from '../ui/atoms/Tooltip.jsx'
import ArchonLogPanel from '../ArchonLogPanel.jsx'
import { TagChip } from '../TagMultiSelect.jsx'
import { displayId } from '../../lib/displayId.js'
import { highlight } from '../../lib/highlight.js'
import { Pencil, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react'
import { sprintKey } from '../../lib/sprintLabel.js'
import { TypeIcon } from '../ui/atoms/typeIcons.jsx'
import MilestonePill from '../MilestonePill.jsx'

// DD-48: Status-Pill nur bei Outliern. refined/planned/done werden durch Spalte impliziert.
export const OUTLIER_STATUSES = new Set(['in_progress', 'to_review', 'blocked', 'cancelled'])

// Draggable issue card — DD-48: 1 Akzent (priority border-left), Type als Icon.
export function IssueCard({ item, isDragging = false, onSelect, onToggleMulti, selected = false, multiSelected = false, highlightQuery = '' }) {
  const tags = item.tags || []
  const showStatusPill = OUTLIER_STATUSES.has(item.status)
  const hasMeta = showStatusPill || tags.length > 0 || item.dependencies_count > 0
  const handleClick = (e) => {
    e.preventDefault()
    if (e.metaKey || e.ctrlKey) { onToggleMulti?.(item.id); return }
    onSelect?.(item.id)
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(item.id) } }}
      data-ui={`sprint-board.card.${item.id}`}
      className={`block py-2 pr-3 mb-2 rounded-lg transition-shadow cursor-pointer ${isDragging ? 'opacity-50' : 'hover:shadow-md'}`}
      style={{
        background: multiSelected ? 'color-mix(in srgb, var(--accent-info) 18%, transparent)' : 'var(--base)',
        borderLeft: `4px solid var(--priority-${item.priority})`,
        paddingLeft: '10px',
        outline: selected ? '2px solid var(--accent-info)' : 'none',
        outlineOffset: '-2px',
      }}
      title={`P${item.priority} · ${item.type} (Cmd/Ctrl+Klick = mehrfach selektieren)`}
    >
      <div className="flex items-center gap-2 mb-1">
        <TypeIcon type={item.type} />
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-w-0">{highlight(item.title, highlightQuery)}</p>
        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--hint)' }}>
          {displayId(item)}
        </span>
      </div>
      {hasMeta && (
        <div className="flex items-center gap-1.5 flex-wrap pl-6">
          {/* DD-252: Inline-Status-Picker (Static-Fallback wenn OUTLIER_STATUSES leer). */}
          {showStatusPill && (
            <StatusPicker
              status={item.status}
              slug={`roadmap.card.${item.id}.status`}
              onChange={async (next, notes) => {
                await patchIssueStatus(item.id, next, notes)
                window.dispatchEvent(new CustomEvent('devd-backlog-changed'))
              }}
            />
          )}
          {tags.map(t => <TagChip key={t.id} tag={t} small />)}
          {item.dependencies_count > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface0)', color: 'var(--mauve)' }}
              title={`${item.dependencies_count} Abhängigkeit(en)`}
            >
              dep:{item.dependencies_count}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Sortable wrapper
export function SortableIssueCard({ item, onSelect, onToggleMulti, selected = false, multiSelected = false, highlightQuery = '' }) {
  const isDisabled = item.status === 'in_progress'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.id),
    disabled: isDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard item={item} onSelect={onSelect} onToggleMulti={onToggleMulti} selected={selected} multiSelected={multiSelected} highlightQuery={highlightQuery} />
    </div>
  )
}

// Sprint column header
// DD-289 R2: onOpenMilestone wird durchgereicht — Klick auf MilestonePill
// navigiert zur Milestone-Detail-Page (/milestone/:id). Klick-Handler
// stoppt Propagation in der Pill selbst, kollidiert nicht mit Drag-Listenern.
export function SprintHeader({ sprint, sprintCount: _sprintCount, onReorder, onAddIssue: _onAddIssue, onRunArchon, onEdit, onDelete, onSprintChanged, archonEnabled, onOpenMilestone }) {
  const { slug } = useParams() // DD-368: für slug-gescopete Review-Links
  const [archonRunning, setArchonRunning] = useState(false)
  const [activeRunId, setActiveRunId] = useState(null)

  useEffect(() => {
    if (!archonEnabled) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/sprints/${sprint.id}/active-run`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          setActiveRunId(data?.run_id ?? null)
        }
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [sprint.id, archonEnabled])

  const handleRunArchon = async () => {
    setArchonRunning(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/run-archon`, { method: 'POST' })
      const data = await res.json()
      if (data.run_id) setActiveRunId(data.run_id)
    } catch {}
    finally { setArchonRunning(false) }
    if (onRunArchon) onRunArchon()
  }

  const itemCount = sprint._itemCount || 0
  const capacityPct = sprint.capacity ? Math.min(100, Math.round((itemCount / sprint.capacity) * 100)) : null

  // DD-187: review-Sprints werden visuell wie active hervorgehoben.
  const isActive = sprint.status === 'active' || sprint.status === 'review'
  return (
    <div className="mb-3">
      {/* DD-166 R2: Sprint-Lifecycle-Aktionen sind direkt Bestandteil der
         Toolbar-Button-Group rechts (kein separates Action-Row mehr).
         DD-267: Volle Milestone-Pill entfällt hier — kompakte "M{id}"-Pill
         steht direkt neben dem Sprint-Key (siehe H3 unten). */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1" />
        <div className="flex items-center gap-1 shrink-0">
        <SprintActions sprint={sprint} onChanged={onSprintChanged} />
        <Tooltip label="Sprint bearbeiten">
          <button
            onClick={() => onEdit(sprint)}
            data-ui={`sprint-board.column-header.${sprint.id}.edit`}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
            aria-label="Sprint bearbeiten"
          >
            <Pencil size={13} />
          </button>
        </Tooltip>
        {onDelete && (
          <Tooltip label="Sprint löschen">
            <button
              onClick={() => onDelete(sprint)}
              data-ui={`sprint-board.column-header.${sprint.id}.delete`}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: 'var(--surface1)', color: 'var(--red)', minHeight: '28px' }}
              aria-label="Sprint löschen"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        )}
        <Tooltip label="Nach links schieben">
          <button
            onClick={() => onReorder(sprint.id, 'up')}
            data-ui={`sprint-board.column-header.${sprint.id}.move-left`}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
            aria-label="Nach links schieben"
          >
            <ChevronLeft size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Nach rechts schieben">
          <button
            onClick={() => onReorder(sprint.id, 'down')}
            data-ui={`sprint-board.column-header.${sprint.id}.move-right`}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
            aria-label="Nach rechts schieben"
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
        {sprint.status !== 'cancelled' && (
          <Tooltip label="Zur Review-Seite">
            <Link
              to={slug ? `/${slug}/review/${sprint.id}` : `/review/${sprint.id}`}
              data-ui={`sprint-board.column-header.${sprint.id}.review`}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
              aria-label="Zur Review-Seite"
            >
              <Eye size={14} />
            </Link>
          </Tooltip>
        )}
        </div>
      </div>

      {/* Titel + Beschreibung UNTER der Button-Group */}
      {/* DD-267: Kompakte "M{id}"-Pill neben dem Sprint-Key (z.B. "DD#34 · M1").
         Tooltip zeigt den vollen Milestone-Namen; Pill rendert nur bei
         vorhandener milestone_id. */}
      <div className="min-w-0 mb-1">
        <h3
          className={`font-bold font-display leading-snug flex items-center gap-1.5 flex-wrap ${isActive ? 'text-base' : 'text-sm'}`}
          data-testid="sprint-card-title"
        >
          <span data-testid="sprint-key" data-ui={`sprint-board.column.${sprint.id}.sprint-id`} className="shrink-0">{sprintKey(sprint)}</span>
          {sprint.milestone_id != null && (
            <MilestonePill
              milestone_id={sprint.milestone_id}
              name={sprint.milestone_name}
              data-testid="sprint-milestone-pill"
              data-ui={`sprint-board.column-header.${sprint.id}.milestone`}
              onClick={onOpenMilestone ? () => onOpenMilestone(sprint.milestone_id) : undefined}
            />
          )}
          {sprint.name && (
            <span data-ui={`sprint-board.column.${sprint.id}.sprint-title`} className="min-w-0 break-words font-normal" style={{ color: 'var(--subtext1)' }}>
              {' — '}{sprint.name}
            </span>
          )}
        </h3>
        {sprint.goal || sprint.notes ? (
          <p data-ui={`sprint-board.column.${sprint.id}.sprint-goal`} className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--subtext1)' }}>{sprint.goal || sprint.notes}</p>
        ) : (
          <p className="text-xs mt-1 italic" style={{ color: 'var(--hint)' }}>Kein Sprint-Ziel hinterlegt</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StatusBadge status={sprint.status === 'active' ? 'in_progress' : sprint.status === 'planning' ? 'new' : sprint.status} />
          <span className="text-xs" style={{ color: 'var(--subtext0)' }}>
            {sprint.terminal_count ?? sprint.done_count ?? 0}/{sprint.item_count || 0}
            {sprint.capacity ? ` (cap: ${sprint.capacity})` : ''}
          </span>
          {/* DD-41: WIP-Anzeige. */}
          {sprint.wip_limit != null && (() => {
            const wipNow = sprint._inProgressCount ?? 0
            const exceeded = wipNow >= sprint.wip_limit
            return (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: exceeded ? 'var(--accent-danger)' : 'var(--surface1)',
                  color: exceeded ? 'var(--on-accent)' : 'var(--subtext0)',
                }}
                title={exceeded ? `WIP-Limit erreicht (${wipNow}/${sprint.wip_limit})` : `Work in Progress: ${wipNow}/${sprint.wip_limit}`}
              >
                WIP {wipNow}/{sprint.wip_limit}
              </span>
            )
          })()}
        </div>
      </div>

      {capacityPct !== null && (
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--surface1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${capacityPct}%`,
              background: capacityPct >= 100 ? 'var(--accent-danger)' : capacityPct >= 80 ? 'var(--accent-warning)' : 'var(--accent-success)',
            }}
          />
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {archonEnabled && (
          <button
            onClick={handleRunArchon}
            disabled={archonRunning}
            data-ui={`sprint-board.column-header.${sprint.id}.run-archon`}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ background: 'var(--mauve)', color: 'var(--on-accent)', minHeight: '28px', opacity: archonRunning ? 0.7 : 1 }}
            title="Archon-Workflow starten"
          >
            {archonRunning ? '...' : 'Archon'}
          </button>
        )}
      </div>
      {archonEnabled && activeRunId && (
        <div className="mt-2">
          <ArchonLogPanel runId={activeRunId} defaultOpen={archonRunning} />
        </div>
      )}
    </div>
  )
}

// Droppable column wrapper — registriert sich bei dnd-kit, damit auch leere
// Spalten gültige Drop-Targets sind. id-Schema: col-new | col-backlog | col-sprint-<id>
// DD-152: Stärkeres Drop-Target-Highlight — Outline + Background-Tint + Scale.
export function DroppableColumn({ columnId, children, className, style, ...rest }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const mergedStyle = {
    ...style,
    outline: isOver ? '2px dashed var(--peach)' : 'none',
    outlineOffset: '-2px',
    background: isOver
      ? `color-mix(in srgb, var(--peach) 8%, ${style?.background || 'transparent'})`
      : style?.background,
    transform: isOver ? 'scale(1.005)' : 'scale(1)',
    transition: 'outline-color 120ms, background-color 120ms, transform 120ms',
  }
  return (
    <div ref={setNodeRef} className={className} style={mergedStyle} {...rest}>
      {children}
    </div>
  )
}
