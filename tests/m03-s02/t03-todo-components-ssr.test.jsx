import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// DD-500: produktiv TodoInput.jsx gelöscht — cutover auf ui/organisms/ChecklistInputForm.
import ChecklistInputForm from '../../apps/frontend/src/components/ui/organisms/ChecklistInputForm.jsx'
// DD-586: legacy ProjectTodoList.jsx archived → import ui/organisms canonical variant
import ProjectTodoList from '../../apps/frontend/src/components/ui/organisms/ProjectTodoList.jsx'
// DD-587: AddLinkPicker, TodoLinksList, TodoDetailModal wurden ins _archive
// verschoben (import-closed dead set; Live-Varianten in ui/organisms). Ihre SSR-
// Describe-Blocks sind unten entfernt — ChecklistInputForm + ProjectTodoList (live) bleiben.

const noop = () => {}

const TODO_FIXTURE = {
  id: 42,
  project_id: 2,
  label: 'Migration ausrollen',
  details: 'Schritt für Schritt',
  status: 'open',
  position: 1,
  created_at: '2026-05-20 10:00:00',
  updated_at: '2026-05-22 14:00:00',
  links: [
    { id: 1, todo_id: 42, type: 'issue', target: 'DD-273', position: 1 },
    { id: 2, todo_id: 42, type: 'url', target: 'https://example.com', position: 2 },
  ],
}

describe('T03 — DD-283 Komponenten SSR', () => {
  // DD-500: Cutover auf ui/organisms/ChecklistInputForm. TodoTab verdrahtet
  // rootDataUi="plugin.todo.quick-add" (gate-kritischer Wurzel-Anker) +
  // dataUiScope="project-home.todo-tab.input" (Kind-Input-Anker bleibt 1:1). Der
  // Add-Button trägt jetzt `${scope}.small` (vormals `.input.submit`).
  describe('Todo Quick-Add (ChecklistInputForm)', () => {
    test('rendert input + add-button mit cutover-Slugs', () => {
      const html = renderToStaticMarkup(
        <ChecklistInputForm
          variant="todo"
          rootDataUi="plugin.todo.quick-add"
          dataUiScope="project-home.todo-tab.input"
          onCreate={noop}
        />
      )
      expect(html).toContain('data-ui="plugin.todo.quick-add"')
      expect(html).toContain('data-ui="project-home.todo-tab.input"')
      expect(html).toContain('data-ui="project-home.todo-tab.input.small"')
    })
  })

  // DD-586: ui/organisms/ProjectTodoList ist kanonisch. dataUiScope ist
  // parametrisiert (default 'project-todo-list'). Anker-Assertions gegen
  // ui/-Defaults — plugin.todo.item (gate-kritisch) bleibt als rootDataUi gesetzt.
  describe('ProjectTodoList Empty-State', () => {
    test('Leere Liste zeigt Empty-State-Hinweis', () => {
      const html = renderToStaticMarkup(<ProjectTodoList todos={[]} onReorder={noop} />)
      expect(html).toContain('data-ui="project-todo-list.empty"')
      expect(html).toContain('Keine ToDos')
    })

    test('Liste mit 1 Item rendert SortableTodoItem mit Label + Pill', () => {
      const html = renderToStaticMarkup(
        <ProjectTodoList
          todos={[TODO_FIXTURE]}
          onReorder={noop}
          onToggleDone={noop}
          onDelete={noop}
          onOpenDetail={noop}
        />
      )
      expect(html).toContain('data-ui="project-todo-list"')
      expect(html).toContain('data-ui="plugin.todo.item"')
      expect(html).toContain('Migration ausrollen')
      // R4: ID-Pill zeigt devd:todo:N (statt #N)
      expect(html).toContain('devd:todo:42')
      // R4: verlinktes Issue als separate klickbare Pille (statt Emoji-Count-Badge)
      expect(html).toContain('data-ui="sortable-todo-item.issue-pill"')
      expect(html).toContain('DD-273')
      // R4: übrige Links (1× url) als dezenter Mono-Counter
      expect(html).toContain('data-ui="sortable-todo-item.links-count"')
      expect(html).not.toContain('🔗')
    })

    test('Done-ToDo bekommt line-through Style', () => {
      const done = { ...TODO_FIXTURE, status: 'done' }
      const html = renderToStaticMarkup(
        <ProjectTodoList todos={[done]} onReorder={noop} onToggleDone={noop} onDelete={noop} onOpenDetail={noop} />
      )
      // DD-500: kanonisches ui/organisms/SortableTodoItem rendert line-through als
      // Tailwind-Klasse statt inline-style text-decoration (token-clean Cutover).
      expect(html).toContain('line-through')
    })
  })

  // DD-587: AddLinkPicker / TodoLinksList / TodoDetailModal SSR-Blocks entfernt —
  // Komponenten ins _archive verschoben (import-closed dead set).
})
