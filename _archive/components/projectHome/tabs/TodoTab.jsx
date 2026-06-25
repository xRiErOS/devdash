// DD-283 R4 (M3-S02 T03): TodoTab Container 1:1 aus DD39-Mockup (.card + card-h).
// Wraps useProjectTodos + TodoInput + ProjectTodoList + TodoDetailModal.
// onOpenIssue: Issue-Key → numerische backlog-id auflösen (gecachter Fetch) → /issues/<id>.

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useProjectNav } from '../../../lib/useProjectNav.js'
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext.jsx'
import { useActiveProject } from '../../../hooks/useActiveProject.js'
import { useProjectTodos } from '../../../hooks/useProjectTodos.js'
import { filterAndSortTodos } from '../../../lib/todoFilter.js'
import SegmentedControl from '../../ui/molecules/SegmentedControl.jsx'
import ChecklistInputForm from '../../ui/organisms/ChecklistInputForm.jsx'
import ProjectTodoList from '../ProjectTodoList.jsx'
import TodoDetailModal from '../TodoDetailModal.jsx'

export default function TodoTab() {
  const { project } = useActiveProject()
  const projectId = project?.id || null
  const navigate = useProjectNav()
  const { confirm } = useConfirmDialog()
  const issueMapRef = useRef(null)
  const {
    todos, loading, error,
    create, patch, remove, reorder, addLink, removeLink,
  } = useProjectTodos(projectId)

  const [openTodoId, setOpenTodoId] = useState(null)
  const openTodo = openTodoId ? todos.find(t => t.id === openTodoId) : null

  // DD-363: Suche (debounced ~200ms) + Default/Alle-Toggle.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(id)
  }, [searchInput])

  const visibleTodos = useMemo(
    () => filterAndSortTodos(todos, { showAll, search }),
    [todos, showAll, search]
  )

  // Reorder NUR in der vollständigen, ungefilterten Positions-Ansicht erlaubt.
  const reorderable = search.trim() === '' && showAll

  const handleToggleDone = (id, nextStatus) => patch(id, { status: nextStatus })

  // DD-500: Der kanonische ui/organisms/SortableTodoItem feuert onDelete OHNE
  // eigenen Confirm (Confirm-Kopplung wurde bewusst in den Screen gehoben). Der
  // Confirm-Flow (vorher inline in der produktiv-Variante) lebt jetzt hier.
  const handleDelete = async (id) => {
    const target = todos.find((t) => t.id === id)
    const ok = await confirm({
      title: 'ToDo löschen?',
      message: `"${target?.label ?? ''}" wird unwiderruflich entfernt.`,
      confirmLabel: 'Löschen',
      danger: true,
    })
    if (ok) remove(id)
  }

  // Issue-Key (z.B. "DD-273") → numerische id → /issues/:id. Backlog einmal gecacht.
  const handleOpenIssue = async (issueKey) => {
    if (!issueKey || !projectId) return
    try {
      if (!issueMapRef.current) {
        const res = await fetch('/api/backlog', { headers: { 'X-Project-Id': String(projectId) } })
        const list = res.ok ? await res.json() : []
        issueMapRef.current = new Map((Array.isArray(list) ? list : []).map(i => [i.key, i.id]))
      }
      const id = issueMapRef.current.get(issueKey)
      if (id) navigate(`/issues/${id}`)
    } catch { /* no-op */ }
  }

  const openCount = todos.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  const doneCount = todos.filter(t => t.status === 'done').length

  return (
    <section
      role="tabpanel"
      id="tabpanel-todo"
      data-ui="project-home.todo-tab"
      style={{
        background: 'var(--mantle)',
        border: '1px solid var(--surface0)',
        borderRadius: 10,
        padding: 'var(--space-4, 16px)',
        boxShadow: 'var(--shadow-card)',
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3, 12px)',
      }}
    >
      <header data-ui="project-home.todo-tab.header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)' }}>
        <span
          aria-hidden="true"
          style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface0)', display: 'grid', placeItems: 'center', color: 'var(--subtext0)', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display, system-ui)' }}>
          Projekt-ToDos{project?.slug ? ` · ${project.slug}` : ''}
        </h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--subtext0)', fontFamily: 'var(--font-display, system-ui)' }}>
          {openCount} offen · {doneCount} erledigt{reorderable ? ' · Drag-Reorder' : ''}
        </span>
      </header>

      {/* DD-500: canonical ui/organisms/ChecklistInputForm. rootDataUi hält den
          gate-kritischen Wurzel-Anker `plugin.todo.quick-add`; dataUiScope hält den
          Kind-Input-Anker auf `project-home.todo-tab.input`. */}
      <ChecklistInputForm
        variant="todo"
        rootDataUi="plugin.todo.quick-add"
        dataUiScope="project-home.todo-tab.input"
        onCreate={create}
        disabled={!projectId || loading}
      />

      {/* DD-363: Suche + Default/Alle-Toggle */}
      <div
        data-ui="project-home.todo-tab.controls"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)', flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search
            size={14}
            aria-hidden="true"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--subtext0)', pointerEvents: 'none' }}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ToDos durchsuchen…"
            aria-label="ToDos durchsuchen"
            data-ui="project-home.todo-tab.search"
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 12px 0 32px',
              fontSize: 16,
              color: 'var(--text)',
              background: 'var(--base)',
              border: '1px solid var(--surface0)',
              borderRadius: 8,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <SegmentedControl
          data-ui="project-home.todo-tab.view-toggle"
          ariaLabel="ToDo-Ansicht"
          size="md"
          options={[
            { value: false, label: 'Aktuell', testId: 'todo-view-default' },
            { value: true, label: 'Alle anzeigen', testId: 'todo-view-all' },
          ]}
          value={showAll}
          onChange={setShowAll}
        />
      </div>

      {!reorderable && visibleTodos.length > 0 && (
        <div
          data-ui="project-home.todo-tab.reorder-hint"
          style={{ fontSize: 11, color: 'var(--overlay1)', fontFamily: 'var(--font-display, system-ui)' }}
        >
          Reihenfolge ändern: „Alle anzeigen“ wählen (ohne aktive Suche).
        </div>
      )}

      {error && (
        <div
          role="alert"
          data-ui="project-home.todo-tab.error"
          style={{ padding: 8, background: 'var(--base)', border: '1px solid var(--red)', borderRadius: 6, color: 'var(--red)', fontSize: 12 }}
        >
          {error}
        </div>
      )}

      <ProjectTodoList
        data-ui="project-home.todo-tab.list"
        todos={visibleTodos}
        reorderable={reorderable}
        onReorder={reorder}
        onToggleDone={handleToggleDone}
        onDelete={handleDelete}
        onOpenDetail={(t) => setOpenTodoId(t.id)}
        onOpenIssue={handleOpenIssue}
      />

      {/* CLI-Hint im Box-Look (Mockup .cli-hint) */}
      <div
        data-ui="project-home.todo-tab.cli-hint"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 12px',
          background: 'var(--base)',
          border: '1px solid var(--surface0)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--subtext0)',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <span style={{ background: 'var(--mauve)', color: 'var(--on-accent)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>CLI</span>
        <code style={{ background: 'var(--mantle)', padding: '1px 6px', borderRadius: 4, color: 'var(--text)' }}>devd-cli todo list · create · update</code>
      </div>

      <TodoDetailModal
        data-ui="project-home.todo-tab.detail-modal"
        open={!!openTodo}
        todo={openTodo}
        onClose={() => setOpenTodoId(null)}
        onPatch={patch}
        onAddLink={addLink}
        onRemoveLink={removeLink}
        onOpenIssue={handleOpenIssue}
      />
    </section>
  )
}
