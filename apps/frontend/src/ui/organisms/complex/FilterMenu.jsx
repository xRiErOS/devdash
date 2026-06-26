/**
 * FilterMenu — anker-loses Popover-Panel zum Filtern einer Liste (Priorität,
 * Issue-Typ, Zeitraum). Konkreter Organism, presentational, props-driven. KEIN
 * eigener Scrim — der Consumer positioniert das Panel an seinem Anker.
 *
 * Komposition: `Chip` (Prioritäten) · `Checkbox` + `Icon` (Issue-Typen) ·
 * `Button` (Fuß-Aktionen). Keine rohen Controls.
 *
 * @param {object} props
 * @param {string[]} [props.prios=['P1','P2','P3','P4']]
 * @param {Array<{key:string,label:React.ReactNode}>} [props.types]
 * @param {Array<{key:string,label:React.ReactNode}>} [props.statuses] - optionale Status-Gruppe
 * @param {Array<{key:string,label:React.ReactNode}>} [props.sprints] - optionale Sprint-Gruppe
 * @param {string} [props.dataUiScope='organism.filterMenu']
 * @param {()=>void} [props.onApply]
 * @param {()=>void} [props.onReset]
 */
import Icon from '../../foundations/Icon.jsx'
import Chip from '../../atoms/Chip.jsx'
import Checkbox from '../../atoms/Checkbox.jsx'
import Button from '../../atoms/Button.jsx'

const DEFAULT_TYPES = [
  { key: 'type-bug', label: 'Bug' },
  { key: 'type-feature', label: 'Feature' },
  { key: 'type-chore', label: 'Chore' },
  { key: 'type-improvement', label: 'Task' },
]

const LABEL = '[font-family:var(--font-display)] text-[10px] font-bold tracking-[0.06em] uppercase text-[var(--overlay1)]'

export default function FilterMenu({
  prios = ['P1', 'P2', 'P3', 'P4'],
  types = DEFAULT_TYPES,
  statuses,
  sprints,
  dataUiScope = 'organism.filterMenu',
  onApply,
  onReset,
}) {
  // Optionale Chip-Gruppe (Status/Sprint) — rendert nur, wenn befüllt.
  const ChipGroup = ({ items, title, slug }) =>
    items && items.length > 0 ? (
      <div data-ui={`${dataUiScope}.group-${slug}`} className="flex flex-col gap-[5px]">
        <div className={LABEL}>{title}</div>
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Chip key={it.key} dataUiScope={`${dataUiScope}.${slug}-${it.key}`}>{it.label}</Chip>
          ))}
        </div>
      </div>
    ) : null
  return (
    <div
      data-ui={dataUiScope}
      role="group"
      aria-label="Filtern nach"
      className="w-[264px] flex flex-col gap-[var(--space-3)] p-[var(--space-3)] bg-[var(--mantle)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-pop)]"
    >
      <div data-ui={`${dataUiScope}.title`} className="[font-family:var(--font-display)] text-[12px] font-bold text-[var(--text)]">
        Filtern nach
      </div>

      <div data-ui={`${dataUiScope}.group-prio`} className="flex flex-col gap-[5px]">
        <div className={LABEL}>Priorität</div>
        <div className="flex gap-1">
          {prios.map((p) => (
            <Chip key={p} dataUiScope={`${dataUiScope}.prio-${p}`}>{p}</Chip>
          ))}
        </div>
      </div>

      <div data-ui={`${dataUiScope}.group-type`} className="flex flex-col gap-[5px]">
        <div className={LABEL}>Issue-Typ</div>
        {types.map((t) => (
          <div key={t.key} className="flex items-center gap-2 p-[3px] text-[12px] text-[var(--text)]">
            <Checkbox dataUiScope={`${dataUiScope}.type-${t.key}.check`} />
            <Icon name={t.key} size={14} mono />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <ChipGroup items={statuses} title="Status" slug="status" />
      <ChipGroup items={sprints} title="Sprint" slug="sprint" />

      <div data-ui={`${dataUiScope}.group-date`} className="flex flex-col gap-[5px]">
        <div className={LABEL}>Erstelldatum / Zeitraum</div>
        <div className="flex gap-[var(--space-2)]">
          {['von', 'bis'].map((d) => (
            <span
              key={d}
              data-ui={`${dataUiScope}.date-${d}`}
              className="flex-1 inline-flex items-center gap-[var(--space-2)] h-[28px] px-[var(--space-2)] rounded-sm bg-[var(--base)] border border-[var(--border)] text-[var(--subtext0)] text-[12px]"
            >
              <Icon name="calendar" size={13} mono /> {d}
            </span>
          ))}
        </div>
      </div>

      <div data-ui={`${dataUiScope}.foot`} className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onReset} dataUiScope={`${dataUiScope}.reset`}>Zurücksetzen</Button>
        <Button variant="primary" onClick={onApply} dataUiScope={`${dataUiScope}.apply`}>Anwenden</Button>
      </div>
    </div>
  )
}
