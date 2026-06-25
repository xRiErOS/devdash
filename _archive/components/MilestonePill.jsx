import React from 'react'
import Tooltip from './ui/atoms/Tooltip.jsx'
import { Map as MapIcon } from 'lucide-react'

/**
 * MilestonePill — DD-267
 *
 * Kompakte Milestone-Kennung "M{milestone_id}" für Sprint-Card-Header.
 * Tooltip zeigt vollen Milestone-Namen. Wenn `code` angegeben, wird dieser
 * Kurz-Code anstelle von "M{id}" verwendet.
 *
 * Props:
 *   - milestone_id: number | string   (Pflicht, wenn kein `code`)
 *   - name: string                     (vollständiger Milestone-Name, für Tooltip)
 *   - code?: string                    (optional: Kurz-Code, überschreibt "M{id}")
 *   - variant?: 'short' | 'full'       (default: 'short' — nur M{id};
 *                                       'full' zeigt Namen mit Icon)
 *   - onClick?: (e) => void            (DD-289 R2: optionaler Klick-Handler —
 *                                       macht die Pill zu einem button-Element
 *                                       mit cursor:pointer + Underline-Hover.
 *                                       Klick stoppt Propagation, damit Sprint-
 *                                       Card-Drag-Handler nicht feuert.)
 *   - className?: string
 *   - 'data-testid'?: string
 */
export default function MilestonePill({
  milestone_id,
  name = '',
  code,
  variant = 'short',
  className = '',
  onClick,
  ...rest
}) {
  const label = pillLabel({ milestone_id, code, variant, name })
  if (!label) return null

  const tooltipText = name || (milestone_id != null ? `Milestone ${label}` : '')

  const isClickable = typeof onClick === 'function'
  const baseStyle = {
    background: 'color-mix(in srgb, var(--accent-info) 18%, transparent)',
    color: 'var(--accent-info)',
    border: '1px solid color-mix(in srgb, var(--accent-info) 35%, transparent)',
    ...(isClickable
      ? {
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationColor: 'transparent',
          textUnderlineOffset: '3px',
          transition: 'text-decoration-color 120ms, background 120ms',
        }
      : {}),
  }

  // DD-289 R2: Klick-Handler stoppt Event-Propagation, damit Sprint-Card-
  // Container-Klicks und Drag-Listener (pointer-down) nicht ausgelöst werden.
  const handleClick = (e) => {
    if (!isClickable) return
    e.stopPropagation()
    e.preventDefault()
    onClick(e)
  }
  const handlePointerDown = (e) => {
    if (!isClickable) return
    // verhindert, dass dnd-kit PointerSensor (parent useSortable) den
    // Klick als Drag-Start interpretiert.
    e.stopPropagation()
  }
  const handleKeyDown = (e) => {
    if (!isClickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onClick(e)
    }
  }

  const commonProps = {
    'data-testid': rest['data-testid'] || 'milestone-pill',
    'data-milestone-id': milestone_id != null ? String(milestone_id) : undefined,
    'data-milestone-name': name || undefined,
    className: `inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium font-mono ${className}`,
    style: baseStyle,
    title: tooltipText || undefined,
    'aria-label': tooltipText ? `Milestone ${label}: ${tooltipText}` : `Milestone ${label}`,
  }

  const pill = isClickable ? (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = 'var(--accent-info)' }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = 'transparent' }}
      {...commonProps}
    >
      {variant === 'full' && <MapIcon size={10} aria-hidden="true" />}
      {label}
    </button>
  ) : (
    <span {...commonProps}>
      {variant === 'full' && <MapIcon size={10} aria-hidden="true" />}
      {label}
    </span>
  )

  if (!tooltipText) return pill
  return <Tooltip label={tooltipText}>{pill}</Tooltip>
}

/**
 * Reine Logik: Welcher Text wird in der Pill angezeigt?
 * Exportiert, damit Unit-Tests sie ohne React-Rendering prüfen können.
 */
export function pillLabel({ milestone_id, code, variant = 'short', name = '' }) {
  if (code && String(code).trim()) return String(code).trim()
  if (variant === 'full' && name) return name
  if (milestone_id == null || milestone_id === '') return ''
  return `M${milestone_id}`
}
