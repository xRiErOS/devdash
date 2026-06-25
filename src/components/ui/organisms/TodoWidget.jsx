import { useState } from 'react'
import WidgetBase from './WidgetBase.jsx'
import Input from '../atoms/Input.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import Tag from '../atoms/Tag.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import ListActionBar from './ListActionBar.jsx'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import { renderMarkdown } from '../../../lib/markdown.js'

const noop = () => {}

/**
 * filterSortTodos — reine View-Ableitung (kein Daten-State): wendet filter/query/sort
 * auf die volle Liste an. Exportiert für Unit-Tests + Consumer-Reuse.
 * @param {Array} todos
 * @param {{query?:string, filter?:'all'|'open'|'done', sort?:'manual'|'label'|'status'}} view
 */
export function filterSortTodos(todos = [], { query = '', filter = 'all', sort = 'manual' } = {}) {
  let out = todos
  if (filter === 'open') out = out.filter((t) => !t.done)
  else if (filter === 'done') out = out.filter((t) => t.done)
  const q = query.trim().toLowerCase()
  if (q) {
    out = out.filter((t) =>
      (t.label || '').toLowerCase().includes(q) ||
      (Array.isArray(t.tags) ? t.tags : []).some((tag) => String(tag).toLowerCase().includes(q)) ||
      (t.descriptionMd || '').toLowerCase().includes(q),
    )
  }
  if (sort === 'label') out = [...out].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
  else if (sort === 'status') out = [...out].sort((a, b) => Number(!!a.done) - Number(!!b.done))
  return out
}

/**
 * TodoWidget — präsentationales ProjectHome-Slot-Widget (GF-2 ProjectPages S2,
 * project-home.slot.todos). WidgetBase-Shell (Layer-3). Bedienelemente: Quick-Add ·
 * ListActionBar (Suche + Filter-/Sort-Trigger, GF-246-Reuse) · je Item Done-Toggle ·
 * Copy-ID · Edit · Delete · Tags · Markdown-Anriss. Search/Filter/Sort sind CONTROLLED
 * View-State (Props) — die sichtbare Liste leitet das Widget rein via filterSortTodos
 * ab. Filter/Sort-Auswahl läuft über FilterDialog/SortDialog (onOpenFilter/onOpenSort,
 * consumer-verdrahtet), analog ListView.
 *
 * PRESENTATIONAL: kein Fetch/Store. Mutationen Callback-delegiert; Live-Wiring = Backend-Track.
 *
 * @param {object} props
 * @param {Array<{id:number|string,label:string,done?:boolean,tags?:string[],descriptionMd?:string}>} [props.todos=[]]
 * @param {(id)=>void} [props.onToggle] @param {(label:string)=>void} [props.onAdd]
 * @param {(id)=>void} [props.onCopyId] @param {(id)=>void} [props.onAssignTag]
 * @param {(id)=>void} [props.onEdit] - Edit bestehender Note (D01; Screen macht Inline/Modal)
 * @param {(id)=>void} [props.onDelete] - Delete (D02; Confirm macht der Screen)
 * @param {string} [props.query=''] @param {(q:string)=>void} [props.onSearch]
 * @param {'all'|'open'|'done'} [props.filter='all'] @param {()=>void} [props.onOpenFilter] - öffnet FilterDialog
 * @param {'manual'|'label'|'status'} [props.sort='manual'] @param {()=>void} [props.onOpenSort] - öffnet SortDialog
 * @param {string} [props.heading='ToDos'] @param {string} [props.dataUi='todo-widget']
 */
export default function TodoWidget({
  todos = [],
  onToggle = noop,
  onAdd = noop,
  onCopyId = noop,
  onAssignTag = noop,
  onEdit = noop,
  onDelete = noop,
  query = '',
  onSearch = noop,
  filter = 'all',
  onOpenFilter = noop,
  sort = 'manual',
  onOpenSort = noop,
  heading = 'ToDos',
  dataUi = 'todo-widget',
}) {
  const [draft, setDraft] = useState('')

  const submitAdd = (e) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) return
    onAdd(value)
    setDraft('')
  }

  const visible = filterSortTodos(todos, { query, filter, sort })

  const controlActions = [
    { id: 'filter', label: 'Filter', icon: <Icon name="filter" size={14} inherit />, active: filter !== 'all', count: filter !== 'all' ? 1 : 0, onTrigger: onOpenFilter },
    { id: 'sort', label: 'Sortieren', icon: <Icon name="sort" size={14} inherit />, active: sort !== 'manual', onTrigger: onOpenSort },
  ]

  return (
    <WidgetBase heading={heading} dataUi={dataUi}>
      <div className="flex flex-col gap-3">
        <form data-ui={`${dataUi}.add`} onSubmit={submitAdd} className="flex items-center gap-2">
          <Input surface="surface0" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ToDo hinzufügen …" aria-label="Neues ToDo" data-ui={`${dataUi}.add.field`} />
          <IconButton type="submit" icon={<Icon name="add" size={16} inherit />} label="ToDo hinzufügen" size="sm" variant="primary" data-ui={`${dataUi}.add.submit`} />
        </form>

        <ListActionBar
          searchValue={query}
          onSearchChange={(e) => onSearch(e.target.value)}
          onSearchClear={() => onSearch('')}
          searchPlaceholder="ToDos durchsuchen …"
          actions={controlActions}
          data-ui={`${dataUi}.controls`}
        />

        {todos.length === 0 ? (
          <EmptyState size="sm" icon={<Icon name="checklist" size={20} mono />} title="Keine ToDos." description="Erstes ToDo oben eingeben." />
        ) : visible.length === 0 ? (
          <EmptyState size="sm" icon={<Icon name="search" size={20} mono />} title="Kein Treffer." description="Suche oder Filter anpassen." />
        ) : (
          <ul data-ui={`${dataUi}.list`} role="list" className="flex flex-col gap-1">
            {visible.map((t) => {
              const itemUi = `${dataUi}.item-${t.id}`
              const tags = Array.isArray(t.tags) ? t.tags : []
              return (
                <li key={t.id} data-ui={itemUi} data-todo-id={t.id} data-done={t.done ? 'true' : 'false'} className="flex flex-col gap-1.5 rounded-lg border border-[var(--surface2)] bg-[var(--layer-4)] p-2.5">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={!!t.done} onChange={() => onToggle(t.id)} data-ui={`${itemUi}.toggle`} aria-label={t.done ? 'ToDo als offen markieren' : 'ToDo als erledigt markieren'} className="mt-0.5" />
                    <span data-ui={`${itemUi}.label`} className={`flex-1 min-w-0 text-sm break-words ${t.done ? 'text-[var(--subtext1)] line-through' : 'text-[var(--text)]'}`}>{t.label}</span>
                    <span data-ui={`${itemUi}.id-pill`} title={`devd:todo:${t.id}`} className="shrink-0 rounded-sm bg-[var(--surface0)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--subtext0)]">devd:todo:{t.id}</span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <IconButton icon={<Icon name="copy" size={14} inherit />} label={`ToDo-ID devd:todo:${t.id} kopieren`} size="sm" variant="ghost" reveal onClick={() => onCopyId(t.id)} data-ui={`${itemUi}.copy`} data-todo-id={t.id} />
                      <IconButton icon={<Icon name="edit" size={14} inherit />} label="ToDo bearbeiten" size="sm" variant="ghost" reveal onClick={() => onEdit(t.id)} data-ui={`${itemUi}.edit`} />
                      <IconButton icon={<Icon name="delete" size={14} inherit />} label="ToDo löschen" size="sm" variant="danger" reveal onClick={() => onDelete(t.id)} data-ui={`${itemUi}.delete`} />
                    </span>
                  </div>

                  {t.descriptionMd && (
                    <div
                      data-ui={`${itemUi}.desc`}
                      className="ps-6 text-[var(--subtext1)] [&_p]:!text-[var(--subtext1)] line-clamp-2 overflow-hidden"
                      // renderMarkdown = reiner read-only Formatter (lib/markdown.js): HTML-String → dangerouslySetInnerHTML.
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(t.descriptionMd) }}
                    />
                  )}

                  <div data-ui={`${itemUi}.tags`} className="flex flex-wrap items-center gap-1.5 ps-6">
                    {tags.map((tag) => (<Tag key={tag} color="neutral">{tag}</Tag>))}
                    <IconButton icon={<Icon name="tag" size={13} inherit />} label="Tag zuweisen" size="sm" variant="ghost" reveal onClick={() => onAssignTag(t.id)} data-ui={`${itemUi}.assign-tag`} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </WidgetBase>
  )
}
