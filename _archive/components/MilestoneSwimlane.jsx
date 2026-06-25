import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Map as MapIcon, Layers } from 'lucide-react'

/**
 * MilestoneSwimlane — DD-288
 *
 * Container-Komponente für die Sprint-Board Milestone-Swimlanes-Ansicht.
 * Rendert einen Milestone-Header (Drag-Handle links, Name + Status-Pill +
 * Sprint-/Item-Counts rechts) und darunter horizontal die Sprint-Cards
 * (children).
 *
 * Drag&Drop:
 *   - useSortable mit id=`milestone-${milestone.id}` (oder
 *     `milestone-__none__` für den „Ohne Milestone"-Bucket).
 *   - Der "Ohne Milestone"-Bucket ist NICHT sortierbar (sortable=false ⇒
 *     keine Listeners, kein Drag-Handle).
 *
 * Props:
 *   - milestone: { id|null, name, status, position, ... }
 *   - sprintCount: number   — Anzahl Sprint-Spalten in diesem Swimlane
 *   - itemCount: number     — Summe der Items in diesem Swimlane
 *   - sortable: boolean     — false ⇒ kein Drag-Handle, kein useSortable-Listener
 *   - onOpenMilestone?: (id) => void
 *                            — DD-289 R2: optionaler Klick-Handler für den
 *                              Header (Pill + Name). Wird ER NICHT übergeben,
 *                              bleibt der Header rein anzeigend. Wird er
 *                              übergeben, wird der Pill/Name-Bereich zu einem
 *                              button-Element mit cursor:pointer + Underline-
 *                              Hover. Drag-Handle bleibt SEPARAT (eigener
 *                              Button links), damit Klick und Drag nicht
 *                              kollidieren. Für den noneBucket (id=null)
 *                              wird kein Klick-Handler aktiviert.
 *   - children: ReactNode   — Sprint-Spalten (horizontal scrollend)
 */
export default function MilestoneSwimlane({
  milestone,
  sprintCount = 0,
  itemCount = 0,
  sortable = true,
  onOpenMilestone,
  children,
}) {
  const isNoneBucket = milestone == null || milestone.id == null
  const sortableId = isNoneBucket ? 'milestone-__none__' : `milestone-${milestone.id}`

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: !sortable || isNoneBucket,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusColor = milestoneStatusColor(milestone?.status)
  const headerBg = isNoneBucket ? 'var(--mantle)' : 'var(--surface0)'
  const headerTextColor = isNoneBucket ? 'var(--overlay0)' : 'var(--text)'

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="milestone-swimlane"
      data-milestone-id={isNoneBucket ? '__none__' : String(milestone.id)}
      className="mb-4"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-t-lg"
        style={{
          background: headerBg,
          borderBottom: '1px solid var(--surface1)',
          color: headerTextColor,
        }}
      >
        {/* Drag-Handle (nur wenn sortable und kein __none__-Bucket) */}
        {sortable && !isNoneBucket ? (
          <button
            type="button"
            className="flex-shrink-0 p-1 rounded transition-colors cursor-grab active:cursor-grabbing"
            style={{ color: 'var(--overlay0)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mauve)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--overlay0)' }}
            title="Milestone-Reihenfolge per Drag & Drop ändern"
            aria-label="Milestone verschieben"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6" style={{ color: 'var(--overlay0)' }} aria-hidden="true">
            <Layers size={14} />
          </span>
        )}

        {/* Name + ID — DD-289 R2: klickbar, wenn onOpenMilestone + nicht noneBucket.
            Drag-Handle (oben, separater Button) bleibt unangetastet —
            stopPropagation hier verhindert, dass der Klick als Drag interpretiert
            wird (PointerSensor lauscht auf pointerdown am useSortable-Container). */}
        {(() => {
          const isClickable = !isNoneBucket && typeof onOpenMilestone === 'function'
          const handleHeaderClick = (e) => {
            if (!isClickable) return
            e.stopPropagation()
            e.preventDefault()
            onOpenMilestone(milestone.id)
          }
          const handleHeaderPointerDown = (e) => {
            if (!isClickable) return
            // Verhindert dnd-kit-Drag-Start auf dem Klick-Target.
            e.stopPropagation()
          }
          const handleHeaderKeyDown = (e) => {
            if (!isClickable) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onOpenMilestone(milestone.id)
            }
          }
          const innerContent = (
            <>
              {!isNoneBucket && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-mono font-medium"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-info) 18%, transparent)',
                    color: 'var(--accent-info)',
                    border: '1px solid color-mix(in srgb, var(--accent-info) 35%, transparent)',
                  }}
                >
                  <MapIcon size={10} aria-hidden="true" />
                  M{milestone.id}
                </span>
              )}
              <h3 className="font-semibold text-sm truncate" style={{ color: headerTextColor }}>
                {isNoneBucket ? 'Ohne Milestone' : milestone.name}
              </h3>
            </>
          )
          if (isClickable) {
            return (
              <button
                type="button"
                onClick={handleHeaderClick}
                onPointerDown={handleHeaderPointerDown}
                onKeyDown={handleHeaderKeyDown}
                data-testid={`swimlane-open-milestone-${milestone.id}`}
                title={`Milestone-Detail "${milestone.name}" öffnen`}
                aria-label={`Milestone "${milestone.name}" öffnen`}
                className="flex items-center gap-2 min-w-0"
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationColor: 'transparent',
                  textUnderlineOffset: '3px',
                  transition: 'text-decoration-color 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = 'var(--accent-info)' }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = 'transparent' }}
              >
                {innerContent}
              </button>
            )
          }
          return (
            <div className="flex items-center gap-2 min-w-0">
              {innerContent}
            </div>
          )
        })()}

        {/* Status-Pill */}
        {!isNoneBucket && milestone?.status && (
          <span
            className="text-[11px] px-2 py-0.5 rounded font-medium"
            style={{
              background: `color-mix(in srgb, var(--${statusColor}) 18%, transparent)`,
              color: `var(--${statusColor})`,
              border: `1px solid color-mix(in srgb, var(--${statusColor}) 35%, transparent)`,
            }}
          >
            {milestone.status}
          </span>
        )}

        {/* Counts (rechts) */}
        <span className="ml-auto text-xs font-mono" style={{ color: 'var(--subtext0)' }}>
          {sprintCount} Sprint{sprintCount === 1 ? '' : 's'} · {itemCount} Item{itemCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Sprint-Spalten — horizontal scrollend */}
      <div
        className="flex gap-4 overflow-x-auto p-3 rounded-b-lg"
        style={{
          background: isNoneBucket ? 'transparent' : 'var(--crust)',
          alignItems: 'flex-start',
          minHeight: '120px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function milestoneStatusColor(status) {
  switch (status) {
    case 'open': return 'accent-info'
    case 'reached': return 'accent-success'
    case 'cancelled': return 'overlay0'
    default: return 'subtext0'
  }
}
