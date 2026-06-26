/**
 * UnassignedColumnHeader — Kopf der „Nicht zugeordnet"-Spalte (Staging).
 *
 * Analog `MilestoneColumnHeader`, aber ohne DragHandle (die Spalte ist nicht
 * verschiebbar) und ohne Entity-ID. Zeigt Titel + Sprint-Anzahl als `Chip`.
 * Reines Molecule, props-driven.
 *
 * @param {object} props
 * @param {number} [props.count=0] - Anzahl nicht zugeordneter Sprints
 * @param {string} [props.dataUiScope='molecule.unassignedColumnHeader']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'
import Chip from '../atoms/Chip.jsx'

export default function UnassignedColumnHeader({
  count = 0, dataUiScope = 'molecule.unassignedColumnHeader', className = '',
}) {
  return (
    <div data-ui={dataUiScope} className={`flex items-center gap-[var(--space-2)] min-w-0 ${className}`}>
      <Icon name="backlog" size={16} mono />
      <h2
        data-ui={`${dataUiScope}.title`}
        className="m-0 min-w-0 flex-1 truncate [font-family:var(--font-display)] text-[14px] font-bold text-[var(--subtext1)]"
      >
        Nicht zugeordnet
      </h2>
      <Chip dataUiScope={`${dataUiScope}.count`} className="shrink-0 pointer-events-none tabular-nums">
        {count}
      </Chip>
    </div>
  )
}
