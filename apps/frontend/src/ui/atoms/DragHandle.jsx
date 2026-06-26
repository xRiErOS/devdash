/**
 * DragHandle — Greif-/Sortier-Anfasser (Grip-Icon-Button).
 *
 * Einziger Drag-Trigger einer Card/Spalte, damit ein Klick auf den Body nicht
 * versehentlich zieht (Navigation bleibt klickbar). Reines Atom: die DnD-Logik
 * lebt im Container — er reicht `listeners`/`attributes` aus `useDraggable` als
 * `...dragHandleProps` herein und markiert den Knoten via `ref`
 * (`setActivatorNodeRef`).
 *
 * @param {object} props
 * @param {string} props.label - aria-label (z.B. "Sprint X verschieben")
 * @param {boolean} [props.disabled=false] - nicht ziehbar (Cursor + aria)
 * @param {boolean} [props.grabbing=false] - aktiv gezogen (Cursor grabbing)
 * @param {string} [props.dataUiScope='atom.dragHandle']
 * @param {string} [props.className]
 * @param {...object} dragHandleProps - listeners + attributes vom Container
 */
import { forwardRef } from 'react'
import Icon from '../foundations/Icon.jsx'

const DragHandle = forwardRef(function DragHandle(
  { label, disabled = false, grabbing = false, dataUiScope = 'atom.dragHandle', className = '', ...dragHandleProps },
  ref,
) {
  const cursor = disabled ? 'cursor-not-allowed opacity-40' : grabbing ? 'cursor-grabbing' : 'cursor-grab'
  return (
    <button
      ref={ref}
      type="button"
      data-ui={dataUiScope}
      aria-label={label}
      title={label}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`inline-flex items-center justify-center size-[24px] shrink-0 rounded-md text-[var(--subtext0)] hover:bg-[var(--state-hover)] focus-visible:outline-2 focus-visible:outline-[var(--accent-info)] ${cursor} ${className}`}
      {...dragHandleProps}
    >
      <Icon name="drag" size={16} label={label} inherit />
    </button>
  )
})

export default DragHandle
