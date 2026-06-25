import { ChevronDown } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import DragHandle from '../atoms/DragHandle.jsx'
import Checkbox from '../atoms/Checkbox.jsx'

/**
 * GF-245 — EntityItem (Organism, 05.10 Lists, OR-06, D04). Die kanonische Listen-
 * Zeile/-Karte für alle Entity-Typen (Meilenstein/Sprint/Issue/DoD/ToDo via
 * `entity`). `layout=card|row` × `surface=filled|bare` × `size` schalten die
 * Darstellung.
 *
 * PO-Review Round 1:
 * - EI-2: Select-Checkbox nur im Select-Mode (`selectable`), nicht per Default.
 * - EI-4: Progress nur rendern, wenn `progress` übergeben wird.
 * - EI-7/8: Disclosure-Chevron IM Item-Head (nicht in separater Row); im Default
 *   sichtbar, wenn Children vorhanden sind. (übersteuert die frühere I03-AccordionRow-
 *   Komposition für EntityItem — PO-Direktive Round 1.)
 * - EI-9/10: `surface=bare` (nur Rahmen, kein Hintergrund) neben `filled` (Card).
 * - EI-11: DragHandle als sichtbarer Anfasser (Desktop-Drag; Touch deferred D09).
 * - SZ-1: `size` sm|md|lg|xl skaliert Padding/Abstände.
 *
 * PO-Review Round 3 (R3-EI-1) — **Text-Grid statt Pills (global):** EntityPill,
 * StatusBadgeSelect und ProgressBar sind **entfernt**; die Item-Infos werden als
 * schlichte Text-Zellen gerendert — `id` (mono) · `type` (Entity-Typ) · `name`
 * (Haupt-Label, flex) · `priority` (optional) · `progress` (`v/max`-Text) · `status`
 * (Text). „Visuell vereinfachen" (PO). **Konsequenz (PO-akzeptiert):** die zeilen-
 * interne interaktive Status-Änderung (EI-6) entfällt — Status ist Text; Bulk-
 * Statuswechsel laufen über den StatusChangeModal (GF-290).
 *
 * Organism (Selektions-/Expand-State + Drag-Interaktion, props-getrieben; State beim
 * Consumer/ListView). Domänen-Fetch bleibt Screen (P3).
 *
 * @param {object} props
 * @param {string} props.id
 * @param {string} [props.name]
 * @param {'sprint'|'issue'|'milestone'|'dod'|'todo'|'neutral'} [props.entity='issue']
 * @param {string} [props.status] - Status als Text-Zelle (R3-EI-1).
 * @param {string} [props.priority] - optionale Priority-Text-Zelle (R3-EI-1).
 * @param {{value:number,max?:number}} [props.progress] - als `v/max`-Text (nur wo übergeben).
 * @param {'card'|'row'} [props.layout='card']
 * @param {'filled'|'bare'} [props.surface='filled'] - filled = Card (Rahmen+Fläche), bare = nur Rahmen.
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {boolean} [props.selectable=false] - Select-Mode → Checkbox sichtbar (EI-2).
 * @param {boolean} [props.selected=false]
 * @param {(e:any)=>void} [props.onSelectChange]
 * @param {boolean} [props.expanded=false]
 * @param {()=>void} [props.onToggleExpand]
 * @param {boolean} [props.dragging=false]
 * @param {boolean} [props.draggable=true]
 * @param {import('react').ReactNode} [props.children] - Child-Panel (nur bei expanded).
 * @param {string} [props['data-ui']='organism.entity-item']
 * @param {string} [props.className]
 */
const SIZE = {
  sm: { pad: 'p-2', rowPad: 'px-2 py-1', gap: 'gap-1.5' },
  md: { pad: 'p-3', rowPad: 'px-2 py-1.5', gap: 'gap-2' },
  lg: { pad: 'p-4', rowPad: 'px-3 py-2', gap: 'gap-3' },
  xl: { pad: 'p-5', rowPad: 'px-4 py-2.5', gap: 'gap-3' },
}

export default function EntityItem({
  id,
  name,
  entity = 'issue',
  status,
  priority,
  progress,
  layout = 'card',
  surface = 'filled',
  size = 'md',
  selectable = false,
  selected = false,
  onSelectChange,
  expanded = false,
  onToggleExpand,
  dragging = false,
  draggable = true,
  children,
  childrenLabel = 'Unteraufgaben',
  'data-ui': dataUi = 'organism.entity-item',
  className = '',
}) {
  const isRow = layout === 'row'
  const hasChildren = Boolean(children)
  const sz = SIZE[size] || SIZE.md

  const shellCls = [
    isRow
      ? `${sz.rowPad} border-b border-[var(--surface1)]`
      : `rounded-md border border-[var(--surface1)] ${surface === 'bare' ? '' : 'bg-[var(--surface0)]'} ${sz.pad}`,
    selected ? 'ring-1 ring-[var(--accent-primary)]' : '',
    dragging ? 'opacity-60' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      data-ui={dataUi}
      data-layout={layout}
      data-surface={surface}
      data-size={size}
      aria-selected={selected}
      className={`${shellCls} ${className}`}
    >
      <div className={`flex items-center ${sz.gap}`}>
        {selectable ? (
          <Checkbox
            checked={selected}
            onChange={onSelectChange}
            label={`${id} auswählen`}
            size="sm"
            data-ui={`${dataUi}.select`}
          />
        ) : null}
        {draggable ? (
          <DragHandle data-ui={`${dataUi}.drag-handle`} />
        ) : null}
        {hasChildren ? (
          <IconButton
            icon={<ChevronDown size={16} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />}
            label={expanded ? `${childrenLabel} einklappen` : `${childrenLabel} ausklappen`}
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            data-ui={`${dataUi}.disclosure`}
          />
        ) : null}
        {/* R3-EI-1: Text-Grid statt Pills/Badge/Bar — schlichte Text-Zellen. */}
        <div data-ui={`${dataUi}.meta`} className="flex min-w-0 flex-1 items-center gap-2">
          <span data-ui={`${dataUi}.id`} className="shrink-0 font-mono text-xs text-[var(--subtext0)]">{id}</span>
          {entity ? (
            <span data-ui={`${dataUi}.type`} className="shrink-0 text-xs text-[var(--subtext1)]">{entity}</span>
          ) : null}
          <span data-ui={`${dataUi}.name`} className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">{name}</span>
          {priority ? (
            <span data-ui={`${dataUi}.priority`} className="shrink-0 text-xs text-[var(--subtext1)]">{priority}</span>
          ) : null}
          {progress ? (
            <span data-ui={`${dataUi}.progress`} className="shrink-0 font-mono text-xs text-[var(--subtext1)]">
              {progress.value}/{progress.max ?? 100}
            </span>
          ) : null}
          {status ? (
            <span data-ui={`${dataUi}.status`} className="shrink-0 text-xs text-[var(--subtext0)]">{status}</span>
          ) : null}
        </div>
      </div>
      {hasChildren && expanded ? (
        <div
          data-ui={`${dataUi}.children`}
          role="region"
          className="mt-2 ps-1 text-sm text-[var(--subtext1)]"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
