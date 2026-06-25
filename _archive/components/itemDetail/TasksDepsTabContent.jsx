import { Link } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { displayId } from '../../lib/displayId.js'
import { parseApiError } from '../../lib/apiError.js'
import SubTaskRow from './SubTaskRow.jsx'

export default function TasksDepsTabContent({
  backlogId,
  slug,
  tasks,
  setTasks,
  newTaskTitle,
  setNewTaskTitle,
  newTaskQa,
  setNewTaskQa,
  taskWarning,
  setTaskWarning,
  savingTask,
  setSavingTask,
  deps,
  addingDep,
  setAddingDep,
  depDirection,
  setDepDirection,
  depSearch,
  setDepSearch,
  filteredBacklog,
  addDependency,
  removeDependency,
}) {
  const patchSubtask = async (subtaskId, body) => {
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseApiError(res, 'Sub-Task speichern fehlgeschlagen'))
    const updated = await res.json()
    setTasks(prev => prev.map(x => x.id === subtaskId ? updated : x).sort((a, b) => (a.position || 0) - (b.position || 0)))
  }

  // DD-45 R04: Sensor-Setup mit Pointer-Activation-Threshold, damit Click-
  // Events auf Toggle/Edit-Buttons nicht versehentlich Drag starten.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    // optimistic: set local order first, then persist
    setTasks(reordered)
    try {
      const res = await fetch(`/api/backlog/${backlogId}/subtasks/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map(t => t.id) }),
      })
      if (!res.ok) throw new Error(await parseApiError(res, 'Reorder fehlgeschlagen'))
      const next = await res.json()
      setTasks(Array.isArray(next) ? next : reordered)
    } catch (err) {
      setTaskWarning(err.message || 'Reorder fehlgeschlagen')
      // revert to server state on failure
      try {
        const r = await fetch(`/api/backlog/${backlogId}/subtasks`)
        if (r.ok) setTasks(await r.json())
      } catch {}
    }
  }

  return (
    <>
      <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--mantle)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>
            Sub-Tasks {tasks.length > 0 && <span style={{ color: 'var(--hint)' }}>· {tasks.filter(t => t.status === 'done').length}/{tasks.length}</span>}
          </h2>
        </div>
        {tasks.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="mb-2">
                {tasks.map((t, i) => (
                  <SubTaskRow
                    key={t.id}
                    task={t}
                    isLast={i === tasks.length - 1}
                    onToggle={async () => {
                      setTaskWarning('')
                      if (t.status !== 'done' && !String(t.qa_criteria || '').trim()) {
                        setTaskWarning('QA-Kriterium ist Pflicht, bevor ein Sub-Task auf done gesetzt wird.')
                        return
                      }
                      const next = t.status === 'done' ? 'open' : 'done'
                      const res = await fetch(`/api/subtasks/${t.id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: next }),
                      })
                      if (res.ok) {
                        const updated = await res.json()
                        setTasks(prev => prev.map(x => x.id === t.id ? updated : x))
                      } else {
                        setTaskWarning(await parseApiError(res, 'Sub-Task-Status wurde abgelehnt.'))
                      }
                    }}
                    onRename={async (title) => {
                      await patchSubtask(t.id, { title })
                    }}
                    onQaEdit={async () => {
                      const next = prompt('QA-Kriterium fuer diesen Sub-Task', t.qa_criteria || '')
                      if (next == null) return
                      await patchSubtask(t.id, { qa_criteria: next.trim() || null })
                    }}
                    onDelete={async () => {
                      const res = await fetch(`/api/subtasks/${t.id}`, { method: 'DELETE' })
                      if (res.ok) setTasks(prev => prev.filter(x => x.id !== t.id))
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        {taskWarning && <p className="text-xs mb-2" style={{ color: 'var(--yellow)' }}>{taskWarning}</p>}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const title = newTaskTitle.trim()
            if (!title || savingTask) return
            setSavingTask(true)
            try {
              const res = await fetch(`/api/backlog/${backlogId}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, qa_criteria: newTaskQa.trim() || null }),
              })
              if (res.ok) {
                const created = await res.json()
                setTasks(prev => [...prev, created])
                setNewTaskTitle('')
                setNewTaskQa('')
                setTaskWarning('')
              } else {
                setTaskWarning(await parseApiError(res, 'Sub-Task konnte nicht angelegt werden.'))
              }
            } finally { setSavingTask(false) }
          }}
          className="grid gap-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              data-ui="issue-detail.subtasks.new-title-input"
              placeholder="Sub-Task hinzufügen…"
              className="flex-1 rounded-lg px-3 py-2 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
              disabled={savingTask}
            />
            <button type="submit" disabled={!newTaskTitle.trim() || savingTask}
              data-ui="issue-detail.subtasks.add"
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: newTaskTitle.trim() ? 'var(--accent-primary)' : 'var(--surface1)', color: 'var(--on-accent)', minHeight: '36px', opacity: !newTaskTitle.trim() || savingTask ? 0.6 : 1 }}>+</button>
          </div>
          <input
            type="text"
            value={newTaskQa}
            onChange={e => setNewTaskQa(e.target.value)}
            data-ui="issue-detail.subtasks.new-qa-input"
            placeholder="QA-Kriterium optional — Pflicht vor done"
            className="rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
            disabled={savingTask}
          />
        </form>
      </div>

      <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>
          Abhängigkeiten · blockiert durch {deps.blocked_by?.length || 0} · blockiert {deps.blocks?.length || 0}
        </h2>
        {deps.blocked_by?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--red)' }}>Blockiert durch:</p>
            {deps.blocked_by.map(d => (
              <div key={d.id} data-ui={`issue-detail.dependencies.blocked-by.item.${d.id}`} className="flex items-center gap-2 mb-1">
                <Link to={slug ? `/${slug}/issues/${d.blocker_id}` : `/issues/${d.blocker_id}`} data-ui={`issue-detail.dependencies.blocked-by.item.${d.id}.link`} className="text-sm hover:underline" style={{ color: 'var(--blue)' }}>
                  #{d.blocker_id} — {d.blocker_title || '...'}
                </Link>
                <button onClick={() => removeDependency(d.id)} data-ui={`issue-detail.dependencies.blocked-by.item.${d.id}.remove`} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-danger)', color: 'var(--on-accent)', minHeight: '24px' }}>x</button>
              </div>
            ))}
          </div>
        )}
        {deps.blocks?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--yellow)' }}>Blockiert:</p>
            {deps.blocks.map(d => (
              <div key={d.id} data-ui={`issue-detail.dependencies.blocks.item.${d.id}`} className="flex items-center gap-2 mb-1">
                <Link to={slug ? `/${slug}/issues/${d.blocked_id}` : `/issues/${d.blocked_id}`} data-ui={`issue-detail.dependencies.blocks.item.${d.id}.link`} className="text-sm hover:underline" style={{ color: 'var(--blue)' }}>
                  #{d.blocked_id} — {d.blocked_title || '...'}
                </Link>
                <button onClick={() => removeDependency(d.id)} data-ui={`issue-detail.dependencies.blocks.item.${d.id}.remove`} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-danger)', color: 'var(--on-accent)', minHeight: '24px' }}>x</button>
              </div>
            ))}
          </div>
        )}
        {!addingDep ? (
          <button onClick={() => setAddingDep(true)} data-ui="issue-detail.dependencies.add" className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}>
            + Abhängigkeit hinzufügen
          </button>
        ) : (
          <div className="mt-2">
            <div className="flex gap-2 mb-2">
              <select value={depDirection} onChange={e => setDepDirection(e.target.value)}
                data-ui="issue-detail.dependencies.direction-select"
                className="rounded-lg px-2 py-1.5 outline-none text-xs"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}>
                <option value="blocked_by">Blockiert durch (anderes Item blockt dieses)</option>
                <option value="blocks">Blockiert (dieses blockiert anderes)</option>
              </select>
            </div>
            <input type="text" value={depSearch} onChange={e => setDepSearch(e.target.value)}
              data-ui="issue-detail.dependencies.search-input"
              className="w-full rounded-lg px-3 py-2 outline-none mb-2"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="Issue suchen (#ID oder Titel)..." autoFocus />
            {filteredBacklog.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ background: 'var(--base)' }}>
                {filteredBacklog.map(b => (
                  <button key={b.id} onClick={() => addDependency(b.id)}
                    data-ui={`issue-detail.dependencies.result.${b.id}`}
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b"
                    style={{ borderColor: 'var(--surface0)', minHeight: '40px' }}>
                    <span className="font-mono">{displayId(b)}</span> — {b.title}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setAddingDep(false); setDepSearch('') }}
              data-ui="issue-detail.dependencies.cancel"
              className="mt-2 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '32px' }}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </>
  )
}
