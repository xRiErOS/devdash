/**
 * TasksDepsTabContent — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/itemDetail/TasksDepsTabContent.jsx).
 *
 * Domänen-bewusste Einheit: der Tasks/Dependencies-Tab eines Issues. Rendert die
 * Sub-Task-Liste (DnD-sortierbar via @dnd-kit, komponiert das ./SubTaskRow.jsx-
 * Organism aus Batch 2), das Sub-Task-Anlegeformular sowie die Abhängigkeiten
 * (blocked_by / blocks) inkl. Hinzufügen-Maske mit Richtungs-Select und
 * Issue-Suche. Komponiert das Molecule ../molecules/Select.jsx (Richtungswahl)
 * und das Organism ./SubTaskRow.jsx.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Gehobene
 * Kopplung gegenüber der Quelle:
 *  - Alle `fetch()`-Aufrufe gegen `/api/subtasks/*` bzw. `/api/backlog/:id/subtasks*`
 *    (Status-Toggle, Rename via `patchSubtask`, QA-Edit, Delete, Create,
 *    Reorder-PUT) sind ENTFERNT und zu Callback-Props gehoben:
 *      onAddTask({title, qa_criteria}) · onToggleTask(task) · onRenameTask(task, title)
 *      onQaEditTask(task) · onDeleteTask(task) · onReorder(reorderedTasks)
 *  - Die optimistische lokale Reorder-Logik (arrayMove) bleibt im DragEnd-Handler,
 *    persistiert aber NICHT mehr selbst — sie reicht das neu sortierte Array an
 *    `onReorder` weiter (Parent persistiert + revertet bei Fehler).
 *  - Dependency-Mutationen (`addDependency`/`removeDependency`) bleiben Callbacks
 *    `onAddDep(id)` / `onRemoveDep(depId)` (waren schon in der Quelle Props).
 *  - `displayId` (reiner Formatter) bleibt importiert — keine Daten-Kopplung.
 *  - Das `prompt()` im QA-Edit der Quelle ist auf den `onQaEditTask`-Callback
 *    gehoben (Parent entscheidet über UI für die Eingabe).
 *
 * Ephemerer UI-State (BLEIBT, als kontrollierte Props): newTaskTitle/newTaskQa,
 * taskWarning, savingTask, addingDep, depDirection, depSearch werden vom Parent
 * gehalten (kontrolliert) — wie in der Quelle.
 *
 * Roh-Farbnamen der Quelle (--mantle/--hint/--yellow/--red/--blue/--base) auf
 * semantische Tokens gemappt: --mantle/--base → --surface0/--surface1,
 * --yellow → --accent-warning, --red → --accent-danger, --blue → --accent-info,
 * --hint → --subtext1. Kein Roh-Hex.
 *
 * @param {object} props
 * @param {string} [props.slug] - Projekt-Slug für Issue-Deep-Links (optional)
 * @param {Array<object>} props.tasks - Sub-Tasks [{id,title,status,qa_criteria,position}]
 * @param {(reordered:object[])=>void} [props.onReorder] - neue Reihenfolge nach DnD (Parent persistiert)
 * @param {(task:object)=>void} [props.onToggleTask] - Checkbox → done/offen
 * @param {(task:object, title:string)=>void} [props.onRenameTask] - Inline-Edit committed
 * @param {(task:object)=>void} [props.onQaEditTask] - QA-Kriterium bearbeiten
 * @param {(task:object)=>void} [props.onDeleteTask] - Sub-Task entfernen
 * @param {({title:string, qa_criteria:string|null})=>void} [props.onAddTask] - neuen Sub-Task anlegen
 * @param {string} [props.newTaskTitle] - kontrollierter Titel-Input
 * @param {(v:string)=>void} [props.setNewTaskTitle]
 * @param {string} [props.newTaskQa] - kontrollierter QA-Input
 * @param {(v:string)=>void} [props.setNewTaskQa]
 * @param {string} [props.taskWarning] - Warn-Text (z.B. QA-Pflicht)
 * @param {boolean} [props.savingTask] - Anlegen läuft → Form disabled
 * @param {{blocked_by?:object[], blocks?:object[]}} [props.deps] - Abhängigkeiten
 * @param {boolean} [props.addingDep] - Hinzufügen-Maske offen
 * @param {(v:boolean)=>void} [props.setAddingDep]
 * @param {'blocked_by'|'blocks'} [props.depDirection]
 * @param {(v:string)=>void} [props.setDepDirection]
 * @param {string} [props.depSearch] - Such-Query Dependency
 * @param {(v:string)=>void} [props.setDepSearch]
 * @param {Array<object>} [props.filteredBacklog] - Suchtreffer für Dep-Auswahl
 * @param {(id:number)=>void} [props.onAddDep] - Treffer wählen → Dependency anlegen
 * @param {(depId:number)=>void} [props.onRemoveDep] - Dependency entfernen
 * @param {string} [props.dataUiScope='tasks-deps-tab-content'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { Link } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { displayId } from '../../../lib/displayId.js'
import Select from '../molecules/Select.jsx'
import SubTaskRow from './SubTaskRow.jsx'

const DEP_DIRECTION_OPTIONS = [
  { value: 'blocked_by', label: 'Blockiert durch (anderes Item blockt dieses)' },
  { value: 'blocks', label: 'Blockiert (dieses blockiert anderes)' },
]

export default function TasksDepsTabContent({
  slug,
  tasks = [],
  onReorder,
  onToggleTask,
  onRenameTask,
  onQaEditTask,
  onDeleteTask,
  onAddTask,
  newTaskTitle = '',
  setNewTaskTitle,
  newTaskQa = '',
  setNewTaskQa,
  taskWarning = '',
  savingTask = false,
  deps = {},
  addingDep = false,
  setAddingDep,
  depDirection = 'blocked_by',
  setDepDirection,
  depSearch = '',
  setDepSearch,
  filteredBacklog = [],
  onAddDep,
  onRemoveDep,
  dataUiScope = 'tasks-deps-tab-content',
}) {
  // DD-45 R04: Sensor-Setup mit Pointer-Activation-Threshold, damit Click-
  // Events auf Toggle/Edit-Buttons nicht versehentlich Drag starten.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const doneCount = tasks.filter(t => t.status === 'done').length

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    // optimistische Neuordnung lokal berechnen, Persistenz an Parent delegieren.
    onReorder?.(arrayMove(tasks, oldIndex, newIndex))
  }

  const handleAddSubmit = (e) => {
    e.preventDefault()
    const title = newTaskTitle.trim()
    if (!title || savingTask) return
    onAddTask?.({ title, qa_criteria: newTaskQa.trim() || null })
  }

  return (
    <div data-ui={dataUiScope}>
      <div data-ui={`${dataUiScope}.subtasks`} className="rounded-xl p-4 mb-3 bg-[var(--surface0)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm text-[var(--subtext0)]">
            Sub-Tasks{' '}
            {tasks.length > 0 && (
              <span className="text-[var(--subtext1)]">· {doneCount}/{tasks.length}</span>
            )}
          </h2>
        </div>
        {tasks.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <ul data-ui={`${dataUiScope}.subtasks.list`} className="mb-2">
                {tasks.map((t, i) => (
                  <SubTaskRow
                    key={t.id}
                    task={t}
                    isLast={i === tasks.length - 1}
                    dataUiScope={`${dataUiScope}.subtasks.item`}
                    onToggle={() => onToggleTask?.(t)}
                    onRename={(title) => onRenameTask?.(t, title)}
                    onQaEdit={() => onQaEditTask?.(t)}
                    onDelete={() => onDeleteTask?.(t)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        {taskWarning && (
          <p data-ui={`${dataUiScope}.subtasks.warning`} className="text-xs mb-2 text-[var(--accent-warning)]">{taskWarning}</p>
        )}
        <form onSubmit={handleAddSubmit} className="grid gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle?.(e.target.value)}
              data-ui={`${dataUiScope}.subtasks.new-title-input`}
              placeholder="Sub-Task hinzufügen…"
              className="flex-1 rounded-lg px-3 py-2 outline-none text-sm bg-[var(--surface0)] text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={savingTask}
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || savingTask}
              data-ui={`${dataUiScope}.subtasks.add`}
              className={`px-3 py-2 rounded-lg text-sm font-medium min-h-9 text-[var(--on-accent)] disabled:opacity-60 disabled:cursor-not-allowed ${newTaskTitle.trim() ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface1)]'}`}
            >
              +
            </button>
          </div>
          <input
            type="text"
            value={newTaskQa}
            onChange={e => setNewTaskQa?.(e.target.value)}
            data-ui={`${dataUiScope}.subtasks.new-qa-input`}
            placeholder="QA-Kriterium optional — Pflicht vor done"
            className="rounded-lg px-3 py-2 outline-none text-sm bg-[var(--surface0)] text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={savingTask}
          />
        </form>
      </div>

      <div data-ui={`${dataUiScope}.deps`} className="rounded-xl p-4 mb-3 bg-[var(--surface0)]">
        <h2 className="font-bold text-sm mb-3 text-[var(--subtext0)]">
          Abhängigkeiten · blockiert durch {deps.blocked_by?.length || 0} · blockiert {deps.blocks?.length || 0}
        </h2>
        {deps.blocked_by?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1 text-[var(--accent-danger)]">Blockiert durch:</p>
            {deps.blocked_by.map(d => (
              <div key={d.id} data-ui={`${dataUiScope}.deps.blocked-by.item`} className="flex items-center gap-2 mb-1">
                <Link
                  to={slug ? `/${slug}/issues/${d.blocker_id}` : `/issues/${d.blocker_id}`}
                  data-ui={`${dataUiScope}.deps.blocked-by.item.link`}
                  className="text-sm hover:underline text-[var(--accent-info)]"
                >
                  #{d.blocker_id} — {d.blocker_title || '...'}
                </Link>
                <button
                  type="button"
                  onClick={() => onRemoveDep?.(d.id)}
                  data-ui={`${dataUiScope}.deps.blocked-by.item.remove`}
                  className="text-xs px-1.5 py-0.5 rounded min-h-6 bg-[var(--accent-danger)] text-[var(--on-accent)]"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        {deps.blocks?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1 text-[var(--accent-warning)]">Blockiert:</p>
            {deps.blocks.map(d => (
              <div key={d.id} data-ui={`${dataUiScope}.deps.blocks.item`} className="flex items-center gap-2 mb-1">
                <Link
                  to={slug ? `/${slug}/issues/${d.blocked_id}` : `/issues/${d.blocked_id}`}
                  data-ui={`${dataUiScope}.deps.blocks.item.link`}
                  className="text-sm hover:underline text-[var(--accent-info)]"
                >
                  #{d.blocked_id} — {d.blocked_title || '...'}
                </Link>
                <button
                  type="button"
                  onClick={() => onRemoveDep?.(d.id)}
                  data-ui={`${dataUiScope}.deps.blocks.item.remove`}
                  className="text-xs px-1.5 py-0.5 rounded min-h-6 bg-[var(--accent-danger)] text-[var(--on-accent)]"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        {!addingDep ? (
          <button
            type="button"
            onClick={() => setAddingDep?.(true)}
            data-ui={`${dataUiScope}.deps.add`}
            className="text-xs px-3 py-1.5 rounded-lg font-medium min-h-9 bg-[var(--surface1)] text-[var(--text)]"
          >
            + Abhängigkeit hinzufügen
          </button>
        ) : (
          <div className="mt-2">
            <div className="flex gap-2 mb-2">
              <Select
                value={depDirection}
                options={DEP_DIRECTION_OPTIONS}
                onChange={v => setDepDirection?.(v)}
                size="sm"
                ariaLabel="Abhängigkeitsrichtung"
                wrap
                className="flex-1"
                data-ui={`${dataUiScope}.deps.direction-select`}
              />
            </div>
            <input
              type="text"
              value={depSearch}
              onChange={e => setDepSearch?.(e.target.value)}
              data-ui={`${dataUiScope}.deps.search-input`}
              className="w-full rounded-lg px-3 py-2 outline-none mb-2 text-base bg-[var(--surface0)] text-[var(--text)]"
              placeholder="Issue suchen (#ID oder Titel)..."
              autoFocus
            />
            {filteredBacklog.length > 0 && (
              <div data-ui={`${dataUiScope}.deps.results`} className="rounded-lg overflow-hidden bg-[var(--surface1)]">
                {filteredBacklog.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onAddDep?.(b.id)}
                    data-ui={`${dataUiScope}.deps.result`}
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b border-[var(--surface0)] min-h-10"
                  >
                    <span className="font-mono">{displayId(b)}</span> — {b.title}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setAddingDep?.(false); setDepSearch?.('') }}
              data-ui={`${dataUiScope}.deps.cancel`}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg min-h-8 bg-[var(--surface1)] text-[var(--text)]"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
