import { fn } from 'storybook/test'
import TodoWidget from '../../../components/ui/organisms/TodoWidget.jsx'

const TODOS = [
  { id: 7, label: 'Capture-Host Allowlist refinen', done: false, tags: ['security', 'backend'], descriptionMd: 'Allowlist **härten** — siehe `captureHostGuard`. Tests in `dd375-*`.' },
  { id: 9, label: 'Snapshot-Gate grün ziehen', done: true, tags: ['ci'] },
  { id: 12, label: 'Drift-Gate dokumentieren', done: false, tags: ['docs'], descriptionMd: 'Kette Story→Code im Canon `L9` ergänzen.' },
  { id: 15, label: 'PO-Review-Flag setzen', done: false },
]

export default {
  title: '05 ORGANISMS/05.30 Widgets/TodoWidget',
  component: TodoWidget,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'padded' },
  args: { onToggle: fn(), onAdd: fn(), onCopyId: fn(), onAssignTag: fn(), onEdit: fn(), onDelete: fn(), onSearch: fn(), onOpenFilter: fn(), onOpenSort: fn() },
}

// Default = Root-Minimal (Checkliste §2): eine offene Aufgabe, keine Tags/Description.
export const Default = {
  name: 'TodoWidget (Root-Minimal)',
  render: (a) => <div data-ui="organism.todo-widget.default"><TodoWidget {...a} /></div>,
  args: { todos: [{ id: 1, label: 'Erstes ToDo', done: false }] },
}

// Main = realistischer Hauptfall: Mix aus offen/erledigt, Tags + Markdown-Anriss.
export const Main = {
  name: 'TodoWidget (Hauptfall)',
  render: (a) => <div data-ui="organism.todo-widget.main"><TodoWidget {...a} /></div>,
  args: { todos: TODOS },
}

export const State_Empty = {
  name: 'TodoWidget (leer)',
  render: (a) => <div data-ui="organism.todo-widget.state-empty"><TodoWidget {...a} /></div>,
  args: { todos: [] },
}

// Suche aktiv: query gesetzt, sichtbare Liste vom Widget gefiltert (controlled).
export const Variant_Searching = {
  name: 'TodoWidget (Suche aktiv)',
  render: (a) => <div data-ui="organism.todo-widget.variant-searching"><TodoWidget {...a} /></div>,
  args: { todos: TODOS, query: 'gate' },
}

// Filter erledigt: nur done-ToDos sichtbar.
export const Variant_FilterDone = {
  name: 'TodoWidget (Filter: erledigt)',
  render: (a) => <div data-ui="organism.todo-widget.variant-filterdone"><TodoWidget {...a} /></div>,
  args: { todos: TODOS, filter: 'done' },
}
