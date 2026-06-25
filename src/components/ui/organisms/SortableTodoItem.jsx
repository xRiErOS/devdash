/**
 * SortableTodoItem — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/SortableTodoItem.jsx).
 *
 * Domänen-bewusste Einheit: eine sortierbare Todo-Zeile (Drag-Handle, gestylte
 * Checkbox mit Done-✓, Label → Detail, verlinkte Issue-Pillen, Misc-Link-Counter,
 * `devd:todo:N`-ID-Pille, dezenter Delete). Komponiert das Atom IssuePill.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Gehobene Kopplung gegenüber
 * der Quelle:
 *  - Quelle nutzte `useConfirmDialog()` und führte den Confirm-Dialog inline vor
 *    `onDelete` aus. Diese Kopplung ist ENTFERNT — der Confirm-Flow gehört in den
 *    Screen. Hier feuert der Delete-Button direkt die Callback-Prop `onDelete(id)`;
 *    der Screen entscheidet, ob/wie er vorher bestätigt.
 *  - Quelle hatte eine inline definierte `IssuePill`-Subkomponente. Ersetzt durch
 *    das kanonische Atom `../atoms/IssuePill.jsx` (Issue-Key als Children, Klick →
 *    `onOpenIssue(target)`).
 *
 * Ephemerer UI-State BLEIBT: `hover` (useState) für Surface-/Delete-Tint,
 * `useSortable` (DnD). Das ist kein Daten-State.
 *
 * DnD: der `transform`/`transition`-style aus `useSortable` ist echt
 * runtime-dynamisch und der EINZIGE inline-style (maxInline=1, eslint-disabled).
 * Alle statischen Styles → Tailwind v4. Drag-Dimming (`opacity`) ist in die
 * className gehoben (kein inline-style nötig).
 *
 * @param {object} props
 * @param {object} props.todo - { id, label, status, links?: [{id,type,target}] }
 * @param {(id:number, nextStatus:'open'|'done')=>void} [props.onToggleDone] - Checkbox-Toggle
 * @param {(id:number)=>void} [props.onDelete] - Delete (Confirm macht der Screen)
 * @param {(todo:object)=>void} [props.onOpenDetail] - Label/Counter-Klick → Detail
 * @param {(issueKey:string)=>void} [props.onOpenIssue] - Issue-Pillen-Klick → Issue öffnen
 * @param {string} [props.dataUiScope='sortable-todo-item'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.rootDataUi] - DD-500: wenn gesetzt, trägt das WURZEL-Element
 *   (div) exakt diesen `data-ui`-Wert (semantischer Plugin-Anker, z.B.
 *   `plugin.todo.item`) statt des `${dataUiScope}`-Default. Kinder-Anker
 *   (drag-handle/checkbox/label/issue-pill/links-count/id-pill/delete) bleiben
 *   `${dataUiScope}…`. Unset → unverändertes Verhalten.
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import EntityPill from '../atoms/EntityPill.jsx'

export default function SortableTodoItem({
  todo,
  onToggleDone,
  onDelete,
  onOpenDetail,
  onOpenIssue,
  dataUiScope = 'sortable-todo-item',
  rootDataUi = dataUiScope,
  className = '',
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
  const [hover, setHover] = useState(false)

  const isDone = todo.status === 'done'
  const isCancelled = todo.status === 'cancelled'
  const links = Array.isArray(todo.links) ? todo.links : []
  const issueLinks = links.filter((l) => l.type === 'issue')
  const otherCount = links.length - issueLinks.length

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    onDelete?.(todo.id)
  }

  // Einziger inline-style: DnD-Transform/Transition (runtime-dynamisch via useSortable),
  // gesetzt auf dem Wurzel-div (eslint-disable dort, siehe unten).
  const dragStyle = { transform: CSS.Transform.toString(transform), transition }

  const rowBg = hover ? 'bg-[var(--surface1)]' : 'bg-[var(--surface0)]'
  const labelColor = isDone || isCancelled ? 'text-[var(--subtext1)]' : 'text-[var(--text)]'

  return (
    <div
      ref={setNodeRef}
      // eslint-disable-next-line react/forbid-dom-props -- DnD-Transform aus useSortable ist runtime-dynamisch und nicht als statische Tailwind-Klasse ausdrückbar.
      style={dragStyle}
      data-ui={`${rootDataUi}`}
      data-todo-id={todo.id}
      data-status={todo.status}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 min-h-11 rounded-lg border border-[var(--surface2)] md:flex-nowrap ${rowBg} ${isDragging ? 'opacity-40' : ''} ${className}`}
    >
      <button
        type="button"
        aria-label="ToDo verschieben"
        data-ui={`${dataUiScope}.drag-handle`}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 min-w-4 bg-transparent border-0 p-0 text-sm leading-none tracking-[-2px] text-[var(--subtext0)] cursor-grab touch-none"
      >
        ⋮⋮
      </button>

      {/* Gestylte Checkbox (kein natives input) — Done = success-bg + ✓ */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        onClick={() => onToggleDone?.(todo.id, isDone ? 'open' : 'done')}
        aria-label={isDone ? 'ToDo als offen markieren' : 'ToDo als erledigt markieren'}
        data-ui={`${dataUiScope}.checkbox`}
        className={`grid place-items-center flex-shrink-0 w-[18px] h-[18px] p-0 rounded-md border-[1.5px] text-xs font-bold leading-none cursor-pointer text-[var(--on-accent)] ${
          isDone
            ? 'border-[var(--accent-success)] bg-[var(--accent-success)]'
            : 'border-[var(--subtext0)] bg-[var(--surface0)]'
        }`}
      >
        {isDone ? '✓' : ''}
      </button>

      <button
        type="button"
        onClick={() => onOpenDetail?.(todo)}
        data-ui={`${dataUiScope}.label`}
        className={`flex-1 min-w-0 text-left bg-transparent border-0 p-0 text-sm font-[inherit] cursor-pointer break-words md:overflow-hidden md:text-ellipsis md:whitespace-nowrap ${labelColor} ${
          isDone ? 'line-through' : ''
        }`}
      >
        {todo.label}
      </button>

      {/* DD-545: Meta-Gruppe (Issue-Pillen + Link-Counter + ID-Pille + Delete).
          basis-full → auf Mobile eigene 2. Zeile unter dem Titel; ab md inline
          rechts neben dem flex-1-Titel (Desktop-Row unverändert einzeilig). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 basis-full md:basis-auto md:flex-nowrap">
      {/* Verlinkte Issues als separate klickbare Pillen → /issues/<target> */}
      {issueLinks.map((l) => (
        <EntityPill
          key={l.id}
          id={l.target}
          entity="issue"
          data-ui={`${dataUiScope}.issue-pill`}
          onClick={() => onOpenIssue?.(l.target)}
          title={`Issue ${l.target} öffnen`}
        />
      ))}

      {/* Übrige Links (spec/vault/url): dezenter Mono-Counter, kein farbiges Badge */}
      {otherCount > 0 && (
        <span
          data-ui={`${dataUiScope}.links-count`}
          title={`${otherCount} verlinkte(s) Dokument(e) öffnen`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetail?.(todo)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onOpenDetail?.(todo)
            }
          }}
          className="inline-flex items-center gap-0.5 flex-shrink-0 font-mono text-[10px] text-[var(--subtext0)] cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {otherCount}
        </span>
      )}

      <span
        data-ui={`${dataUiScope}.id-pill`}
        title={`devd:todo:${todo.id}`}
        className="flex-shrink-0 px-1.5 py-0.5 rounded-sm font-mono text-[10px] bg-[var(--surface0)] text-[var(--subtext0)]"
      >
        devd:todo:{todo.id}
      </span>

      <button
        type="button"
        onClick={handleDeleteClick}
        aria-label="ToDo löschen"
        data-ui={`${dataUiScope}.delete`}
        className={`flex-shrink-0 ml-auto bg-transparent border-0 px-1 py-0.5 text-sm leading-none cursor-pointer ${
          hover ? 'text-[var(--accent-danger)]' : 'text-[var(--subtext0)]'
        }`}
      >
        ×
      </button>
      </div>
    </div>
  )
}
