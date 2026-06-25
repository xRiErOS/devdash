import { GripVertical } from 'lucide-react'
import IconButton from './IconButton.jsx'

/**
 * DragHandle — Atom (03.10 Inputs, GF-323). Der kanonische Drag-Anfasser für
 * sortierbare Zeilen/Karten (Desktop-Reorder; Touch deferred D09). Extrahiert aus
 * dem zuvor inline in EntityItem gerenderten GripVertical-IconButton — D08: alle
 * Drag-Handles aus EINER Quelle (EntityItem, MilestoneBoardColumn, …).
 *
 * Dünner Wrapper um `IconButton` (variant=ghost, GripVertical) + grab-Cursor. Reicht
 * Drag-Handler (onPointerDown/onMouseDown/draggable…) via `...rest` an den Button durch.
 *
 * @param {object} props
 * @param {string} [props.label='Ziehen zum Sortieren'] - aria-label/title.
 * @param {'sm'|'md'|'lg'} [props.size='sm']
 * @param {boolean} [props.disabled]
 * @param {string} [props['data-ui']='drag-handle'] - Parent-Scope-fähig (Consumer überschreibt).
 * @param {string} [props.className]
 */
export default function DragHandle({
  label = 'Ziehen zum Sortieren',
  size = 'sm',
  disabled = false,
  'data-ui': dataUi = 'drag-handle',
  className = '',
  ...rest
}) {
  return (
    <IconButton
      icon={<GripVertical size={16} aria-hidden="true" />}
      label={label}
      variant="ghost"
      size={size}
      disabled={disabled}
      data-ui={dataUi}
      className={`cursor-grab ${className}`}
      {...rest}
    />
  )
}
