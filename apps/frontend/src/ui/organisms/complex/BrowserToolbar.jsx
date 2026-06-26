/**
 * BrowserToolbar — Kopfzeile des ElementBrowsers (Spec §3): Suche + Filter + Sort,
 * darunter die Aktiv-Filter-Chip-Zeile (FilterBar-Rolle). Komponiert vorhandene
 * Atoms (`Input`, `Button`, `Chip`, `SegmentedControl`) + nimmt den bestehenden
 * `FilterMenu`-Organismus als anker-loses Popover entgegen (D02 — kein paralleles
 * Filter-UI). Liegt in `organisms/complex`, weil es einen Organismus orchestriert.
 *
 * Presentational, props-driven. Such-Atom `Input` hat keinen Icon-Slot → führendes
 * `search`-Icon hier per Wrapper (relative + absolute Icon, Input mit pl).
 *
 * @param {object} props
 * @param {string} [props.query='']
 * @param {(v:string)=>void} [props.onQueryChange]
 * @param {string} [props.sort='title'] - aktives Sort-Segment
 * @param {Array<{key:string,label:React.ReactNode,iconName?:string}>} [props.sortOptions] - Default: SORT_OPTIONS
 * @param {(key:string)=>void} [props.onSortChange]
 * @param {Array<{key:string,label:React.ReactNode}>} [props.activeFilters=[]] - FilterBar-Chips
 * @param {(key:string)=>void} [props.onRemoveFilter]
 * @param {boolean} [props.filterOpen=false] - FilterMenu-Popover sichtbar
 * @param {()=>void} [props.onToggleFilter]
 * @param {React.ReactNode} [props.filterMenu] - der FilterMenu-Organismus (Popover-Inhalt)
 * @param {string} [props.dataUiScope='organism.browserToolbar']
 * @param {string} [props.className]
 */
import Icon from '../../foundations/Icon.jsx'
import Input from '../../atoms/Input.jsx'
import Button from '../../atoms/Button.jsx'
import Chip from '../../atoms/Chip.jsx'
import SegmentedControl from '../../atoms/SegmentedControl.jsx'

// Sort-Segmente sind UI-Konfiguration (kein Daten-Fixture) → hier als Default.
export const SORT_OPTIONS = [
  { key: 'title', label: 'Titel', iconName: 'sort' },
  { key: 'priority', label: 'Prio', iconName: 'flag' },
  { key: 'rank', label: 'Rang', iconName: 'list' },
  { key: 'created', label: 'Neu', iconName: 'calendar' },
  { key: 'updated', label: 'Update', iconName: 'history' },
]

export default function BrowserToolbar({
  query = '', onQueryChange,
  sort = 'title', sortOptions = SORT_OPTIONS, onSortChange,
  activeFilters = [], onRemoveFilter,
  filterOpen = false, onToggleFilter, filterMenu,
  dataUiScope = 'organism.browserToolbar', className = '',
}) {
  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)] bg-[var(--mantle)] border-b border-[var(--border)] ${className}`}
    >
      {/* Steuer-Zeile: Suche · Filter · Sort */}
      <div data-ui={`${dataUiScope}.controls`} className="flex items-center gap-[var(--space-2)]">
        <label data-ui={`${dataUiScope}.search`} className="relative flex-1 min-w-0">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="search" size={15} mono />
          </span>
          <Input
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder="Suchen … (/ oder Cmd+F)"
            dataUiScope={`${dataUiScope}.search.input`}
            className="pl-8 py-1.5 text-[13px]"
          />
        </label>

        <div data-ui={`${dataUiScope}.filter`} className="relative">
          <Button variant="ghost" size="sm" iconName="filter" onClick={onToggleFilter} aria-expanded={filterOpen} dataUiScope={`${dataUiScope}.filter.trigger`}>
            Filter
          </Button>
          {filterOpen && filterMenu && (
            <div data-ui={`${dataUiScope}.filter.popover`} className="absolute right-0 top-[calc(100%+6px)] z-20">
              {filterMenu}
            </div>
          )}
        </div>

        <SegmentedControl
          options={sortOptions}
          value={sort}
          onChange={onSortChange}
          dataUiScope={`${dataUiScope}.sort`}
        />
      </div>

      {/* FilterBar: aktive Filter als löschbare Chips (nur wenn gesetzt) */}
      {activeFilters.length > 0 && (
        <div data-ui={`${dataUiScope}.activeFilters`} className="flex flex-wrap items-center gap-1">
          {activeFilters.map((f) => (
            <Chip key={f.key} active onClick={() => onRemoveFilter?.(f.key)} dataUiScope={`${dataUiScope}.chip-${f.key}`} className="gap-1">
              {f.label}
              <Icon name="close" size={11} mono className="ml-0.5" />
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
