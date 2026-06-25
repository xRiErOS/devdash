import ListActionBar from './ListActionBar.jsx'
import EntityItem from './EntityItem.jsx'
import BulkActionBar from './BulkActionBar.jsx'
import SelectAllModal from './SelectAllModal.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import Skeleton from '../atoms/Skeleton.jsx'

/**
 * GF-244 — ListView (Organism, 05.10 Lists, OR-05, D03/D04). Die EINE kanonische
 * Listen-Familie statt N bespoke Listen. Config-getrieben
 * `{entity, scope, columns, allowedBulkActions}` für Backlog · EntityList · Tag-
 * Ergebnis (Trash = deferred/Mock, D02 — CAP-trash-lost-issues 🔴 → GF-280/sprint-06).
 *
 * Komponiert ListActionBar (Kopf, GF-246) + EntityItem[] (Items, GF-245) +
 * BulkActionBar (bei Selektion, GF-247) + EmptyState/Skeleton (Empty/Loading).
 *
 * Ebene-6 (OR-05): CAP-issue-list 🟢, CAP-project-list 🟢, CAP-project-sstd-read 🟢,
 * CAP-tag-list 🟢, CAP-trash-lost-issues 🔴 missing (→ Trash deferred), CAP-trash-
 * soft-delete-status 🟡 partial.
 *
 * Reflow-Vertrag (D10-G): card↔row über Container-Query (`@container/list`), token-
 * gebundene Schwelle (`--cq-md`) — NICHT Viewport. Vertrag im MDX dokumentiert; der
 * `layout`-Prop setzt die Darstellung (P3 verdrahtet die Container-Query-Klasse).
 *
 * @param {object} props
 * @param {{entity?:string,scope?:string,columns?:string[],allowedBulkActions?:string[]}} [props.config]
 * @param {Array<{id:string,name?:string,status?:string,statusOptions?:any[],progress?:{value:number,max?:number},entity?:string,children?:import('react').ReactNode,expanded?:boolean,onToggleExpand?:()=>void}>} [props.items=[]]
 * @param {boolean} [props.loading=false]
 * @param {'card'|'row'} [props.layout='card']
 * @param {string} [props.searchValue]
 * @param {(e:any)=>void} [props.onSearchChange]
 * @param {()=>void} [props.onSearchClear]
 * @param {string} [props.searchPlaceholder]
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - reicht an alle EntityItems durch (SZ-1).
 * @param {Array<object>} [props.triggerActions=[]] - ListActionBar action-as-data.
 * @param {boolean} [props.selectMode=false] - Select-Mode → EntityItem-Checkboxen (EI-2).
 * @param {()=>void} [props.onToggleSelectMode] - gesetzt → Kopf-Toggle rendert; Klick öffnet den SelectAllModal (R3-LAB-1).
 * @param {boolean} [props.selectAllOpen=false] - SelectAllModal (GF-292) offen.
 * @param {()=>void} [props.onSelectAllClose] - SelectAllModal schließen.
 * @param {()=>void} [props.onToggleSelectAll] - „Alle auswählen"/„Auswahl leeren" im Modal.
 * @param {()=>void} [props.onSelectAllConfirm] - SelectAllModal OK (Auswahl übernehmen).
 * @param {string[]} [props.selectedIds=[]]
 * @param {(id:string)=>void} [props.onSelectChange]
 * @param {()=>void} [props.onClearSelection]
 * @param {Array<object>} [props.bulkActions=[]] - BulkActionBar action-as-data.
 * @param {{icon?:import('react').ReactNode,title?:string,description?:string}} [props.empty]
 * @param {string} [props['data-ui']='organism.list-view']
 * @param {string} [props.className]
 */
export default function ListView({
  config,
  items = [],
  loading = false,
  layout = 'card',
  size = 'md',
  searchValue = '',
  onSearchChange,
  onSearchClear,
  searchPlaceholder = 'Suchen…',
  triggerActions = [],
  selectMode = false,
  onToggleSelectMode,
  selectAllOpen = false,
  onSelectAllClose,
  onToggleSelectAll,
  onSelectAllConfirm,
  selectedIds = [],
  onSelectChange,
  onClearSelection,
  bulkActions = [],
  empty,
  'data-ui': dataUi = 'organism.list-view',
  className = '',
}) {
  const selectedCount = selectedIds.length
  const allSelected = items.length > 0 && selectedCount >= items.length
  const someSelected = selectedCount > 0 && !allSelected
  const allowedBulk = config?.allowedBulkActions
    ? bulkActions.filter((a) => config.allowedBulkActions.includes(a.id))
    : bulkActions

  return (
    <div
      data-ui={dataUi}
      data-scope={config?.scope}
      className={`@container/list flex flex-col gap-3 ${className}`}
    >
      <div data-ui={`${dataUi}.head`}>
        <ListActionBar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSearchClear={onSearchClear}
          searchPlaceholder={searchPlaceholder}
          actions={triggerActions}
          selectMode={selectMode}
          onToggleSelectMode={onToggleSelectMode}
          data-ui={`${dataUi}.action-bar`}
        />
      </div>

      <SelectAllModal
        open={selectAllOpen}
        onClose={onSelectAllClose}
        selectedCount={selectedCount}
        totalCount={items.length}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelectAll={onToggleSelectAll}
        onConfirm={onSelectAllConfirm}
      />

      {selectedCount > 0 ? (
        <div data-ui={`${dataUi}.bulk`}>
          <BulkActionBar
            selectedCount={selectedCount}
            onClearSelection={onClearSelection}
            actions={allowedBulk}
            data-ui={`${dataUi}.bulk-bar`}
          />
        </div>
      ) : null}

      <div
        data-ui={`${dataUi}.items`}
        className={layout === 'row' ? 'rounded-md border border-[var(--surface1)]' : 'flex flex-col gap-2'}
      >
        {loading ? (
          <div data-ui={`${dataUi}.loading`} className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="block" height="3rem" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div data-ui={`${dataUi}.empty`}>
            <EmptyState
              icon={empty?.icon}
              title={empty?.title ?? 'Keine Einträge'}
              description={empty?.description ?? 'Diese Liste ist leer.'}
            />
          </div>
        ) : (
          items.map((it) => (
            <EntityItem
              key={it.id}
              id={it.id}
              name={it.name}
              entity={config?.entity ?? it.entity ?? 'issue'}
              status={it.status}
              priority={it.priority}
              progress={it.progress}
              layout={layout}
              size={size}
              selectable={selectMode}
              selected={selectedIds.includes(it.id)}
              onSelectChange={() => onSelectChange?.(it.id)}
              expanded={it.expanded}
              onToggleExpand={it.onToggleExpand}
              data-ui={`${dataUi}.item-${it.id}`}
            >
              {it.children}
            </EntityItem>
          ))
        )}
      </div>
    </div>
  )
}
