/**
 * ProjectBrowser — linke Shell-Spalte (VS-Code-artig): zeigt die Projekt-
 * Struktur Milestone › Sprint › Issue als Baum, mit Such-/Sort-/Filter-Tools
 * und Umschalt Struktur↔Backlog. Ein-/ausklappbar über `collapsed`.
 *
 * Komposition: `CommandBar` (Filter-Feld) + `IconButton` (Sort/Filter/Toggle) +
 * `SegmentedControl` (View-Umschalt) + `TreeRow` je Baum-Zeile. Kollabiert auf
 * einen schmalen Streifen mit vertikalem Label. Presentational, props-driven.
 *
 * @param {object} props
 * @param {boolean} [props.collapsed=false]
 * @param {string} [props.view='struktur'] - aktiver SegmentedControl-Key
 * @param {Array<{indent:0|1|2,caret?:'open'|'closed'|'none',id?:React.ReactNode,idKind?:string,lead?:React.ReactNode,label?:React.ReactNode,active?:boolean}>} [props.tree=[]]
 * @param {string} [props.dataUiScope='organism.projectBrowser']
 */
import CommandBar from '../../molecules/CommandBar.jsx'
import TreeRow from '../../molecules/TreeRow.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import SegmentedControl from '../../atoms/SegmentedControl.jsx'

const VIEWS = [
  { key: 'struktur', label: 'Struktur', iconName: 'layers' },
  { key: 'backlog', label: 'Backlog', iconName: 'backlog' },
]

export default function ProjectBrowser({
  collapsed = false,
  view = 'struktur',
  tree = [],
  dataUiScope = 'organism.projectBrowser',
}) {
  if (collapsed) {
    return (
      <div
        data-ui={dataUiScope}
        className="w-10 flex flex-col items-center gap-[var(--space-3)] py-[var(--space-3)] border-r border-[var(--border)] bg-[var(--mantle)]"
      >
        <IconButton iconName="chevron-right" label="Ausklappen" dataUiScope={`${dataUiScope}.toggle`} />
        <span
          data-ui={`${dataUiScope}.label`}
          className="[writing-mode:vertical-rl] [font-family:var(--font-display)] text-[11px] tracking-[0.06em] text-[var(--subtext0)]"
        >
          STRUKTUR
        </span>
      </div>
    )
  }
  return (
    <div
      data-ui={dataUiScope}
      className="w-[264px] flex flex-col border-r border-[var(--border)] bg-[var(--mantle)]"
    >
      <div
        data-ui={`${dataUiScope}.head`}
        className="flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]"
      >
        <span className="[font-family:var(--font-display)] text-[12px] font-bold text-[var(--text)]">
          devd2 · Struktur
        </span>
        <IconButton iconName="chevron-left" label="Einklappen" dataUiScope={`${dataUiScope}.toggle`} />
      </div>
      <div
        data-ui={`${dataUiScope}.tools`}
        className="flex flex-col gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-[var(--space-2)]">
          <CommandBar placeholder="Filtern …" dataUiScope={`${dataUiScope}.filter`} className="flex-1" />
          <IconButton iconName="sort" label="Sortieren" dataUiScope={`${dataUiScope}.sort`} />
          <IconButton iconName="filter" label="Filter" dataUiScope={`${dataUiScope}.filterToggle`} />
        </div>
        <SegmentedControl options={VIEWS} value={view} dataUiScope={`${dataUiScope}.view`} />
      </div>
      <div
        data-ui={`${dataUiScope}.tree`}
        className="flex-1 overflow-auto p-[var(--space-2)] flex flex-col gap-px"
      >
        {tree.map((row, i) => (
          <TreeRow
            key={String(row.id ?? row.lead ?? i)}
            indent={row.indent}
            caret={row.caret ?? 'none'}
            id={row.id}
            idKind={row.idKind}
            lead={row.lead}
            label={row.label}
            active={row.active}
            dataUiScope={`${dataUiScope}.row-${row.id ?? row.lead ?? i}`}
          />
        ))}
      </div>
    </div>
  )
}
