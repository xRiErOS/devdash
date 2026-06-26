/**
 * ElementBrowserScreen — generischer Listen-Screen (Spec §1–§3): Drei-Zonen-
 * Layout aus `BrowserToolbar` (oben), `ElementList` + `ListItemPreview` (Mitte,
 * Push) und `BulkActionBar` (unten, fixiert). Basis für Backlog- und
 * SprintReview-Screen — dieselbe Hülle, nur andere Default-Filter.
 *
 * Presentational: alle Daten + Callbacks kommen als Props rein. Der Connected-
 * Wrapper (`useElementBrowser` + MSW, siehe Story `Connected`) hält State und
 * Roundtrips und reicht hier nur Props/Callbacks durch — kein Fetch im Screen.
 *
 * @param {object} props
 * @param {Array} [props.items=[]] - Listen-/Baum-Daten (ElementList)
 * @param {string[]} [props.expandedIds=[]]
 * @param {string[]} [props.selectedIds=[]]
 * @param {object} [props.preview] - aktives Element für die Preview ({type,data,size})
 * @param {'empty'|'no-match'|null} [props.empty=null]
 * @param {string} [props.query='']
 * @param {string} [props.sort='title']
 * @param {Array} [props.activeFilters=[]]
 * @param {boolean} [props.filterOpen=false]
 * @param {React.ReactNode} [props.filterMenu] - überschreibt das Default-FilterMenu (Connected: echte Sprint-Optionen)
 * @param {(v:string)=>void} [props.onQueryChange]
 * @param {(key:string)=>void} [props.onSortChange]
 * @param {()=>void} [props.onToggleFilter]
 * @param {(key:string)=>void} [props.onRemoveFilter]
 * @param {(id:string)=>void} [props.onToggleExpand]
 * @param {(id:string)=>void} [props.onToggleSelect]
 * @param {(ids:string[])=>void} [props.onSelectRange] - Shift+Pfeil-Range aus der Liste
 * @param {(item:object)=>void} [props.onOpenItem]
 * @param {()=>void} [props.onEmptyAction]
 * @param {()=>void} [props.onClearSelection]
 * @param {(action:string, value?:any)=>void} [props.onBulkAction]
 * @param {()=>void} [props.onClosePreview]
 * @param {string} [props.dataUiScope='screen.elementBrowser']
 */
import BrowserToolbar from '../organisms/complex/BrowserToolbar.jsx'
import ElementList from '../organisms/base/ElementList.jsx'
import ListItemPreview from '../organisms/complex/ListItemPreview.jsx'
import BulkActionBar from '../organisms/base/BulkActionBar.jsx'
import FilterMenu from '../organisms/complex/FilterMenu.jsx'

const STATUSES = [
  { key: 'new', label: 'Neu' },
  { key: 'in_progress', label: 'In Arbeit' },
  { key: 'to_review', label: 'Review' },
  { key: 'done', label: 'Done' },
]
const SPRINTS = [
  { key: 'dd49', label: 'DD2#49 Browser-Organismus' },
  { key: 'dd50', label: 'DD2#50 Promote' },
]

export default function ElementBrowserScreen({
  items = [],
  expandedIds = [],
  selectedIds = [],
  preview = null,
  empty = null,
  query = '',
  sort = 'title',
  activeFilters = [],
  filterOpen = false,
  filterMenu,
  bulkOptions,
  onQueryChange, onSortChange, onToggleFilter, onRemoveFilter,
  onToggleExpand, onToggleSelect, onSelectRange, onOpenItem, onEmptyAction,
  onClearSelection, onBulkAction, onClosePreview,
  dataUiScope = 'screen.elementBrowser',
}) {
  const previewOpen = !!preview
  const selectionActive = selectedIds.length > 0
  const menu = filterMenu ?? (
    <FilterMenu statuses={STATUSES} sprints={SPRINTS} dataUiScope={`${dataUiScope}.filterMenu`} />
  )

  // Esc schließt die Preview auch, wenn der Fokus noch in der Liste steht
  // (die Preview selbst fängt Esc bereits ab, sobald sie den Fokus hat).
  const onFrameKeyDown = (e) => {
    if (e.key === 'Escape' && previewOpen) { e.preventDefault(); onClosePreview?.() }
  }

  return (
    <div data-ui={`${dataUiScope}.frame`} onKeyDown={onFrameKeyDown} className="flex h-screen flex-col bg-[var(--base)] text-[var(--text)]">
      <BrowserToolbar
        query={query}
        sort={sort}
        activeFilters={activeFilters}
        filterOpen={filterOpen}
        filterMenu={menu}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
        onToggleFilter={onToggleFilter}
        onRemoveFilter={onRemoveFilter}
        dataUiScope={`${dataUiScope}.toolbar`}
      />

      {/* Mitte: Liste (flex-1, intern scrollbar) + Push-Panel. pb gegen die fixierte BulkActionBar. */}
      <div data-ui={`${dataUiScope}.body`} className={`flex min-h-0 flex-1 ${selectionActive ? 'pb-14' : ''}`}>
        <ElementList
          items={items}
          expandedIds={expandedIds}
          selectedIds={selectedIds}
          activeId={preview?.data?.id}
          empty={empty}
          onToggleExpand={onToggleExpand}
          onToggleSelect={onToggleSelect}
          onSelectRange={onSelectRange}
          onOpen={onOpenItem}
          onEmptyAction={onEmptyAction}
          dataUiScope={`${dataUiScope}.list`}
          className="min-w-0 flex-1"
        />
        <ListItemPreview
          open={previewOpen}
          type={preview?.type}
          data={preview?.data?.detail}
          size={preview?.size || 'default'}
          onClose={onClosePreview}
          dataUiScope={`${dataUiScope}.preview`}
        />
      </div>

      <BulkActionBar
        count={selectedIds.length}
        options={bulkOptions}
        onClear={onClearSelection}
        onAction={onBulkAction}
        dataUiScope={`${dataUiScope}.bulk`}
      />
    </div>
  )
}
