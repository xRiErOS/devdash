/**
 * SubTaskRow — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/itemDetail/SubTaskRow.jsx).
 *
 * Domänen-bewusste Einheit: rendert eine einzelne Sub-Task-Zeile eines Issues
 * (Toggle-Checkbox, Inline-Titel-Edit, QA-Kriterium-Badge, Drag-Handle, Delete).
 * dnd-kit `useSortable` für Reorder — die Zeile ist als sortierbares Item gedacht
 * und MUSS innerhalb eines <DndContext>/<SortableContext> gerendert werden.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle erhielt Daten bereits als `task`-Prop und Mutationen als
 *    Callbacks (onToggle/onRename/onQaEdit/onDelete) — diese bleiben unverändert
 *    als Callback-Props. Es gab keine fetch/Store-Kopplung zu heben.
 *  - Der einzige verbliebene inline-`style` ist der runtime-dynamische
 *    DnD-Transform aus `useSortable` (Transform/Transition/Drag-Opacity); er
 *    trägt `eslint-disable react/forbid-dom-props`. Alle ehemals 6 statischen
 *    Inline-Styles (Checkbox-Border/Background, Titel-Farbe/Strikethrough,
 *    QA-Badge-Farben inkl. roher `rgba(166,218,149,…)`-Werte, Drag/Delete-Icon)
 *    sind auf Tailwind-v4-Token-Klassen gemappt.
 *
 * Ephemerer UI-State (BLEIBT): `editing`/`draft` (useState) für den Inline-Edit
 * des Titels samt Enter/Escape/Blur-Handling.
 *
 * @param {object} props
 * @param {object} props.task - Sub-Task: { id, title, status, qa_criteria? }
 * @param {boolean} [props.isLast=false] - letzte Zeile → keine Trennlinie unten
 * @param {() => void} [props.onToggle] - Checkbox → done/offen umschalten
 * @param {(title:string) => void} [props.onRename] - Inline-Edit committed neuen Titel
 * @param {() => void} [props.onQaEdit] - QA-Kriterium bearbeiten öffnen
 * @param {() => void} [props.onDelete] - Sub-Task entfernen
 * @param {string} [props.dataUiScope='sub-task-row'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useState } from 'react'
import { X, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SubTaskRow({
  task,
  isLast = false,
  onToggle,
  onRename,
  onQaEdit,
  onDelete,
  dataUiScope = 'sub-task-row',
}) {
  // DD-45 R04: Drag&Drop via @dnd-kit. Up/Down-Buttons ersetzt durch Drag-Handle.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const done = task.status === 'done'

  // EINZIGER inline-style: runtime-dynamischer DnD-Transform (useSortable).
  // Der eslint-disable sitzt am JSX-style-Attribut unten (dort feuert die Regel).
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // done → success-Border + gefüllter Hintergrund, sonst Overlay-Border transparent.
  const checkboxClass = done
    ? 'border-[var(--accent-success)] bg-[var(--accent-success)]'
    : 'border-[var(--overlay0)] bg-transparent'
  // QA-Badge: gesetzt → success-Tint, sonst Surface-Grund.
  const qaClass = task.qa_criteria
    ? 'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] text-[var(--accent-success)] border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]'
    : 'bg-[var(--surface0)] text-[var(--hint)] border-[var(--surface1)]'

  return (
    <li
      ref={setNodeRef}
      // eslint-disable-next-line react/forbid-dom-props -- DnD-Transform/Transition aus useSortable ist pro Frame runtime-berechnet und nicht statisch via Tailwind ausdrückbar.
      style={dndStyle}
      data-ui={dataUiScope}
      className={`group flex items-center gap-2 py-2 text-sm border-b ${isDragging ? 'opacity-50' : 'opacity-100'} ${isLast ? 'border-b-transparent' : 'border-b-[var(--surface0)]'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        data-ui={`${dataUiScope}.toggle`}
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className={`flex items-center justify-center rounded shrink-0 w-[18px] h-[18px] border-2 ${checkboxClass}`}
      >
        {done && <span className="text-[11px] leading-none text-[var(--on-accent)]">✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          data-ui={`${dataUiScope}.title-input`}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            const t = draft.trim()
            if (t && t !== task.title) onRename?.(t)
            setEditing(false)
            setDraft(t || task.title)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.target.blur() }
            else if (e.key === 'Escape') { setDraft(task.title); setEditing(false) }
          }}
          className="flex-1 min-w-0 px-2 py-1 rounded outline-none text-sm bg-[var(--surface0)] text-[var(--text)]"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 truncate cursor-text ${done ? 'text-[var(--hint)] line-through' : 'text-[var(--text)] no-underline'}`}
          data-ui={`${dataUiScope}.title`}
          onClick={() => setEditing(true)}
        >
          {task.title}
        </span>
      )}
      <button
        type="button"
        onClick={onQaEdit}
        data-ui={`${dataUiScope}.qa-edit`}
        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${qaClass}`}
        title={task.qa_criteria || 'QA-Kriterium bearbeiten'}
      >
        QA
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-ui={`${dataUiScope}.drag-handle`}
        aria-label="Sub-Task ziehen"
        title="Reihenfolge per Drag&Drop"
        className="shrink-0 flex items-center justify-center rounded cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 focus:opacity-100 w-6 h-6 text-[var(--hint)]"
      >
        <GripVertical size={14} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        data-ui={`${dataUiScope}.delete`}
        aria-label="Sub-Task entfernen"
        title="Entfernen"
        className="shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 text-[var(--hint)]"
      >
        <X size={12} />
      </button>
    </li>
  )
}
