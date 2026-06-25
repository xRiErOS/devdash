import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

describe('T03 — DD-283 Komponenten + data-ui-Slugs', () => {
  test('projectHomeApi exportiert 7 ToDo-Funktionen + LINK_TYPES + TODO_STATUSES', () => {
    const s = src('apps/frontend/src/lib/projectHomeApi.js')
    for (const fn of ['listTodos', 'createTodo', 'patchTodo', 'deleteTodo', 'reorderTodos', 'addTodoLink', 'removeTodoLink']) {
      expect(s, fn).toMatch(new RegExp(`export function ${fn}`))
    }
    expect(s).toMatch(/export const LINK_TYPES =/)
    expect(s).toMatch(/export const TODO_STATUSES =/)
  })

  test('useProjectTodos exportiert + nutzt projectHomeApi', () => {
    const s = src('apps/frontend/src/hooks/useProjectTodos.js')
    expect(s).toMatch(/export function useProjectTodos/)
    expect(s).toMatch(/from '\.\.\/lib\/projectHomeApi\.js'/)
    expect(s).toMatch(/Optimistic-Updates/)
  })

  test('useProjectTodos macht optimistic update + rollback bei error', () => {
    const s = src('apps/frontend/src/hooks/useProjectTodos.js')
    expect(s).toMatch(/snapshotRef/)
    expect(s).toMatch(/rollback/)
  })

  // DD-587: TodoTab-/AddLinkPicker-/TodoLinksList-/TodoDetailModal-Source-Asserts
  // gelöscht — diese projectHome-Dateien wurden ins _archive verschoben
  // (import-closed dead set). Es bleibt die LIVE-Coverage von projectHomeApi,
  // useProjectTodos, ui/organisms/SortableTodoItem und ProjectTodoList.

  // DD-500: produktiv SortableTodoItem.jsx gelöscht — ProjectTodoList rendert das
  // kanonische ui/organisms/SortableTodoItem. Strike-Through/dnd-kit leben dort;
  // der gate-kritische Wurzel-Anker `plugin.todo.item` wird am Call-Site gesetzt.
  test('ui/organisms/SortableTodoItem nutzt @dnd-kit/sortable + Strike-Through bei done', () => {
    const s = src('apps/frontend/src/components/ui/organisms/SortableTodoItem.jsx')
    expect(s).toMatch(/@dnd-kit\/sortable/)
    expect(s).toMatch(/useSortable/)
    expect(s).toMatch(/line-through/)
  })

  // DD-586: legacy path archived → ui/organisms/ProjectTodoList is canonical.
  test('ui/organisms/ProjectTodoList rendert SortableTodoItem mit plugin.todo.item-Anker', () => {
    const s = src('apps/frontend/src/components/ui/organisms/ProjectTodoList.jsx')
    expect(s).toMatch(/from '\.\/SortableTodoItem\.jsx'/)
    expect(s).toMatch(/rootDataUi="plugin\.todo\.item"/)
  })

  test('ui/organisms/ProjectTodoList nutzt DndContext + SortableContext + arrayMove', () => {
    const s = src('apps/frontend/src/components/ui/organisms/ProjectTodoList.jsx')
    expect(s).toMatch(/DndContext/)
    expect(s).toMatch(/SortableContext/)
    expect(s).toMatch(/arrayMove/)
  })
})
