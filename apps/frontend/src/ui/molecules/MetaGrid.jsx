/**
 * MetaGrid — zweispaltige Detail-Tabelle (Label → Wert) für Meta-Daten eines
 * Issues/Sprints (Status, Priorität, Sprint, Typ …).
 *
 * Presentational, props-driven. Label in gedämpftem Ton, Wert hervorgehoben.
 * Kein Toggle (→ `WidgetBase`), kein Reintext (→ `Section`).
 *
 * @param {object} props
 * @param {Array<{label: React.ReactNode, value: React.ReactNode}>} props.rows
 * @param {string} [props.dataUiScope='molecule.metaGrid']
 * @param {string} [props.className]
 */
import { Fragment } from 'react'

export default function MetaGrid({ rows = [], dataUiScope = 'molecule.metaGrid', className = '' }) {
  return (
    <div
      data-ui={dataUiScope}
      className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px] max-w-[520px] ${className}`}
    >
      {rows.map((row) => (
        <Fragment key={String(row.label)}>
          <span data-ui={`${dataUiScope}.label-${row.label}`} className="text-[var(--subtext0)]">{row.label}</span>
          <b data-ui={`${dataUiScope}.value-${row.label}`} className="text-[var(--text)] font-semibold">{row.value}</b>
        </Fragment>
      ))}
    </div>
  )
}
