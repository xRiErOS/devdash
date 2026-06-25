import { ChevronRight } from 'lucide-react'
import Checkbox from '../atoms/Checkbox.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * DoDItem — Molecule (04.40 Data Display, GF-241 / ML-16). Eine Definition-of-Done-
 * Zeile: Checkbox-Atom + Kriteriums-Text + optionaler Detail-IconButton (Drill-in).
 * Komponiert von OR-23 (DoD-Checklist).
 *
 * Dumb-Molecule (CONV-molecule-boundary): controlled — `checked` ist Prop, `onToggle`
 * und `onDetail` sind Callbacks. Die Persistenz/Transition lag bisher inline im
 * MilestoneDodEditor (Organism); hier rein präsentational extrahiert.
 *
 * @param {object} props
 * @param {boolean} [props.checked=false] - erfüllt → Checkbox an, Text durchgestrichen.
 * @param {(e:any)=>void} [props.onToggle] - Checkbox-onChange-Callback.
 * @param {() => void} [props.onDetail] - gesetzt → Detail-IconButton sichtbar.
 * @param {string} [props.detailLabel='Detail öffnen'] - aria-label des Detail-Buttons.
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} props.children - Kriteriums-Text.
 * @param {string} [props.className]
 */
export default function DoDItem({
  checked = false,
  onToggle,
  onDetail,
  detailLabel = 'Detail öffnen',
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  return (
    <div data-ui="dod-item" className={`flex items-center gap-2 py-1 ${className}`} {...rest}>
      <Checkbox checked={checked} onChange={onToggle} disabled={disabled} />
      <span
        data-ui="dod-item.text"
        className={`min-w-0 flex-1 break-words text-sm ${checked ? 'text-[var(--subtext0)] line-through' : 'text-[var(--text)]'}`}
      >
        {children}
      </span>
      {onDetail && (
        <IconButton
          icon={<ChevronRight size={16} aria-hidden="true" />}
          label={detailLabel}
          onClick={onDetail}
          disabled={disabled}
          size="sm"
          variant="ghost"
          data-ui="dod-item.detail"
        />
      )}
    </div>
  )
}
