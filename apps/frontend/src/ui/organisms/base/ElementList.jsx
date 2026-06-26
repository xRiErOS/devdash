/**
 * ElementList — scrollbarer Listen-Organismus des ElementBrowsers (Spec §4).
 * Rendert `ElementRow[]`, bis zu 3 Ebenen verschachtelt (Milestone > Sprint >
 * Issue) via Disclosure. Leerer Zustand delegiert an `EmptyState` (Spec §7).
 *
 * Presentational, props-driven. Expand-Zustand + Selektion kommen als Props
 * (Set/Array) rein; Toggles meldet die Liste nach oben (Consumer hält State).
 *
 * Keyboard (APG-Tree): der Container ist der einzige Tab-Stop; `useListNavigation`
 * hält den Roving-Fokus und markiert die aktive Zeile per `aria-activedescendant`.
 * Pfeil bewegt, Shift+Pfeil markiert eine Range (`onSelectRange`), Enter öffnet
 * (`onOpen`), Space toggelt die Selektion. Ein einzelnes Tab verlässt die Liste.
 *
 * @param {object} props
 * @param {Array} props.items - Baum: jedes Item ggf. mit `children[]`
 * @param {string[]} [props.expandedIds=[]] - aufgeklappte Knoten
 * @param {string[]} [props.selectedIds=[]] - selektierte Zeilen
 * @param {string} [props.activeId] - Preview-Ziel
 * @param {'empty'|'no-match'|null} [props.empty=null] - erzwingt EmptyState-Variante
 * @param {(id:string)=>void} [props.onToggleExpand]
 * @param {(id:string)=>void} [props.onToggleSelect]
 * @param {(ids:string[])=>void} [props.onSelectRange] - Shift+Pfeil-Range
 * @param {(item:object)=>void} [props.onOpen]
 * @param {()=>void} [props.onEmptyAction]
 * @param {string} [props.dataUiScope='organism.elementList']
 * @param {string} [props.className]
 */
import ElementRow from '../../molecules/ElementRow.jsx'
import EmptyState from '../../atoms/EmptyState.jsx'
import { useListNavigation } from './useListNavigation.js'

export default function ElementList({
  items = [], expandedIds = [], selectedIds = [], activeId, empty = null,
  onToggleExpand, onToggleSelect, onSelectRange, onOpen, onEmptyAction,
  dataUiScope = 'organism.elementList', className = '',
}) {
  // Roving-Fokus + Tastatur — Hook hält den State, Liste reicht Callbacks rein.
  const nav = useListNavigation({ items, expandedIds, onOpen, onToggleSelect, onSelectRange })
  const rowDomId = (id) => `${dataUiScope}-ti-${id}`

  const isEmpty = empty || items.length === 0
  if (isEmpty) {
    return (
      <div data-ui={dataUiScope} className={`flex items-center justify-center ${className}`}>
        <EmptyState variant={empty || 'empty'} onAction={onEmptyAction} dataUiScope={`${dataUiScope}.empty`} />
      </div>
    )
  }

  const rows = []
  const walk = (list, level) => {
    for (const it of list) {
      const kids = it.children || []
      const hasKids = kids.length > 0
      const open = expandedIds.includes(it.id)
      rows.push(
        <ElementRow
          key={it.id}
          id={rowDomId(it.id)}
          kind={it.kind}
          issueType={it.issueType}
          entityId={it.entityId}
          title={it.title}
          status={it.status}
          priority={it.priority}
          level={level}
          caret={hasKids ? (open ? 'open' : 'closed') : 'none'}
          selected={selectedIds.includes(it.id)}
          active={activeId === it.id}
          focused={nav.activeId === it.id}
          tabbable={false}
          onToggleCaret={() => { onToggleExpand?.(it.id); nav.focusRow(it.id) }}
          onToggleSelect={() => { onToggleSelect?.(it.id); nav.focusRow(it.id) }}
          onOpen={() => { onOpen?.(it); nav.focusRow(it.id) }}
          dataUiScope={`${dataUiScope}.row-${it.id}`}
        />,
      )
      if (hasKids && open) walk(kids, Math.min(level + 1, 2))
    }
  }
  walk(items, 0)

  return (
    <div
      ref={nav.containerRef}
      data-ui={dataUiScope}
      role="tree"
      tabIndex={0}
      aria-label="Element-Liste"
      aria-multiselectable="true"
      aria-activedescendant={nav.activeId ? rowDomId(nav.activeId) : undefined}
      onKeyDown={nav.onKeyDown}
      onFocus={nav.onFocus}
      className={`flex flex-col gap-0.5 overflow-y-auto p-[var(--space-2)] ${className}`}
    >
      {rows}
    </div>
  )
}
