import { X } from 'lucide-react'
import Tag from '../atoms/Tag.jsx'
import Badge from '../atoms/Badge.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * TagChip — Molecule (04.40 Data Display, GF-238 / D06). Die interaktive Variante
 * des read-only `Tag`-Atoms: Tag + optionaler Count-Badge (z.B. Häufigkeit) +
 * optionaler Remove-IconButton.
 *
 * Dumb-Molecule (CONV-molecule-boundary): präsentational, kein eigener State.
 * `onRemove` ist der Consumer-Callback (Entfernen aus der Auswahl); der Remove-
 * Button erscheint nur, wenn `onRemove` gesetzt ist. Token-clean.
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'danger'|'warning'|'info'} [props.color='neutral'] - Tag-Farbe.
 * @param {number} [props.count] - optionaler Count → Badge (nur bei typeof number).
 * @param {()=>void} [props.onRemove] - gesetzt → Remove-Button sichtbar.
 * @param {string} [props.removeLabel='Entfernen'] - aria-label des Remove-Buttons.
 * @param {boolean} [props.disabled=false] - sperrt den Remove-Button.
 * @param {import('react').ReactNode} [props.children] - Tag-Label.
 * @param {string} [props.className]
 */
export default function TagChip({
  color = 'neutral',
  count,
  onRemove,
  removeLabel = 'Entfernen',
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  return (
    <span data-ui="tag-chip" className={`inline-flex items-center gap-1 ${className}`} {...rest}>
      <Tag color={color} data-ui="tag-chip.tag">{children}</Tag>
      {typeof count === 'number' && (
        <Badge size="sm" data-ui="tag-chip.count">{count}</Badge>
      )}
      {onRemove && (
        <IconButton
          icon={<X size={14} aria-hidden="true" />}
          label={removeLabel}
          onClick={onRemove}
          disabled={disabled}
          size="sm"
          variant="ghost"
          data-ui="tag-chip.remove"
        />
      )}
    </span>
  )
}
