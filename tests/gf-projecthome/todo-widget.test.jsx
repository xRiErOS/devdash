import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import TodoWidget, { filterSortTodos } from '../../src/components/ui/organisms/TodoWidget.jsx'

const TODOS = [
  { id: 7, label: 'Capture-Host Allowlist refinen', done: false, tags: ['security', 'backend'], descriptionMd: 'Allowlist **härten** — siehe `captureHostGuard`.' },
  { id: 9, label: 'Snapshot-Gate grün ziehen', done: true },
  { id: 12, label: 'Drift-Gate dokumentieren', done: false, tags: ['docs'] },
]

const count = (s, sub) => s.split(sub).length - 1

describe('TodoWidget — präsentationales ProjectHome-Slot-Widget (S2 T2 + D01-D03)', () => {
  test('Wurzel data-ui="todo-widget" (WidgetBase-Shell)', () => {
    expect(html(<TodoWidget todos={TODOS} />)).toContain('data-ui="todo-widget"')
  })

  test('N .item == fixture-Länge', () => {
    const out = html(<TodoWidget todos={TODOS} />)
    expect(count(out, 'todo-widget.item-')).toBeGreaterThanOrEqual(TODOS.length)
    expect(out).toContain('todo-widget.item-7')
    expect(out).toContain('todo-widget.item-12')
  })

  test('Quick-Add + ListActionBar (Suche + Filter-/Sort-Trigger, GF-246-Reuse)', () => {
    const out = html(<TodoWidget todos={TODOS} />)
    expect(out).toContain('todo-widget.add')
    expect(out).toContain('todo-widget.controls') // ListActionBar-Wurzel
    expect(out).toContain('todo-widget.controls.search')
    expect(out).toContain('todo-widget.controls.trigger-filter')
    expect(out).toContain('todo-widget.controls.trigger-sort')
  })

  test('je Item: Toggle · Copy(ID) · Edit · Delete', () => {
    const out = html(<TodoWidget todos={TODOS} />)
    expect(out).toContain('todo-widget.item-7.toggle')
    expect(out).toContain('todo-widget.item-7.copy')
    expect(out).toContain('data-todo-id="7"')
    expect(out).toContain('todo-widget.item-7.edit')
    expect(out).toContain('todo-widget.item-7.delete')
  })

  test('Projekt-Tags + Markdown-Anriss (bold)', () => {
    const out = html(<TodoWidget todos={TODOS} />)
    expect(out).toContain('data-ui="tag"')
    expect(out).toContain('security')
    expect(out).toContain('<strong>härten</strong>')
  })

  // --- D03: controlled Search/Filter/Sort (Widget leitet sichtbare Liste pur ab) ---
  test('filter="done" → nur erledigte ToDos sichtbar', () => {
    const out = html(<TodoWidget todos={TODOS} filter="done" />)
    expect(out).toContain('todo-widget.item-9')
    expect(out).not.toContain('todo-widget.item-7')
    expect(out).not.toContain('todo-widget.item-12')
  })

  test('filter="open" → nur offene ToDos sichtbar', () => {
    const out = html(<TodoWidget todos={TODOS} filter="open" />)
    expect(out).toContain('todo-widget.item-7')
    expect(out).toContain('todo-widget.item-12')
    expect(out).not.toContain('todo-widget.item-9')
  })

  test('query filtert auf Label/Tags/Beschreibung', () => {
    const out = html(<TodoWidget todos={TODOS} query="snapshot" />)
    expect(out).toContain('todo-widget.item-9')
    expect(out).not.toContain('todo-widget.item-7')
  })

  test('query ohne Treffer → EmptyState (Liste nicht leer)', () => {
    const out = html(<TodoWidget todos={TODOS} query="zzz-kein-treffer" />)
    expect(out).toContain('data-ui="empty-state"')
  })

  test('leere Liste → EmptyState + Add-Input bleibt', () => {
    const out = html(<TodoWidget todos={[]} />)
    expect(out).toContain('data-ui="empty-state"')
    expect(out).toContain('todo-widget.add')
  })

  // --- pure helper ---
  test('filterSortTodos: filter/query/sort rein funktional', () => {
    expect(filterSortTodos(TODOS, { filter: 'done' }).map((t) => t.id)).toEqual([9])
    expect(filterSortTodos(TODOS, { query: 'drift' }).map((t) => t.id)).toEqual([12])
    expect(filterSortTodos(TODOS, { sort: 'label' }).map((t) => t.label)[0]).toBe('Capture-Host Allowlist refinen')
    expect(filterSortTodos(TODOS, { sort: 'status' }).map((t) => t.id)[2]).toBe(9) // done ans Ende
    expect(filterSortTodos(TODOS, {}).map((t) => t.id)).toEqual([7, 9, 12]) // manual = Eingangsreihenfolge
  })
})
