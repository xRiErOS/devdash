/**
 * GF-257 — ChildrenWidget (05.30 Widgets, OR-22). Kind-Accordion: MS → Sprints,
 * SP → Issues, IS → SubTasks. Komponiert AccordionRow (GF-240); hält Aufklapp-State.
 * Präsentational: items + Callbacks vom Consumer.
 *
 * Ebene-6-Gegencheck (OR-22, 7 Caps): sprint-read, subtask-add/list/update/done/
 * delete/reorder (_ebene6.md).
 */
import ChildrenWidget from '../../../components/ui/organisms/ChildrenWidget.jsx'

const noop = () => {}

const MILESTONES = [
  { key: 'm1', label: 'M3 · Core-Foundation', status: 'active', panel: '4 Sprints · 2 abgeschlossen' },
  { key: 'm2', label: 'M4 · Boards & Detail', status: 'planning', panel: '0 Sprints · in Planung' },
]
const SPRINTS = [
  { key: 's1', label: 'DD#56 · Frontend-Rework', status: 'active', panel: '12 Issues · 8 done · Kapazität 20' },
  { key: 's2', label: 'DD#57 · Boards', status: 'planning', panel: '5 Issues · 0 done · Kapazität 15' },
]
const ISSUES = [
  { key: 'i1', label: 'DD-251 · MetaCard', status: 'done', panel: '3 SubTasks · alle erledigt' },
  { key: 'i2', label: 'DD-252 · Boards', status: 'active', panel: '2 SubTasks · 1 offen' },
]
const SUBTASKS = [
  { key: 't1', label: 'Ref-Test schreiben', status: 'done', panel: 'Abgeschlossen am 2026-06-17' },
  { key: 't2', label: 'Story + MDX', status: 'active', panel: 'In Arbeit' },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/ChildrenWidget',
  component: ChildrenWidget,
  tags: ['status:stable', 'qa_behavioral:open', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
  argTypes: {
    childLabel: { control: 'text' },
    defaultOpenKey: { control: 'text' },
    framed: { control: 'boolean' },
  },
  args: {
    childLabel: 'Sprints',
    items: SPRINTS,
    defaultOpenKey: 's1',
    framed: false,
  },
}
export default meta

// Default: args-getrieben — Milestone → Sprints, erste Zeile offen; Titel-Klick navigiert
// (onNavigate, AccordionRow-Split-Modus), Chevron toggelt (autodocs-Primary).
export const Default = {
  args: { childLabel: undefined, items: [], defaultOpenKey: undefined, framed: false },
  render: (args) => (
    <div data-ui="organism.children-widget.default" className="max-w-md">
      <ChildrenWidget {...args} onNavigate={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Milestone → Sprints, erste Zeile offen (GF-297).
export const Main = {
  render: () => (
    <div data-ui="organism.children-widget.at-milestone" className="max-w-md">
      <ChildrenWidget childLabel="Sprints" items={SPRINTS} defaultOpenKey="s1" onNavigate={noop} />
    </div>
  ),
}

// Variant_AtProject: Project → Milestones (oberste Kind-Ebene) (GF-297).
export const Variant_AtProject = {
  render: () => (
    <div data-ui="organism.children-widget.at-project" className="max-w-md">
      <ChildrenWidget childLabel="Milestones" items={MILESTONES} defaultOpenKey="m1" onNavigate={noop} />
    </div>
  ),
}

// Variant_AtSprint: Sprint → Issues.
export const Variant_AtSprint = {
  render: () => (
    <div data-ui="organism.children-widget.at-sprint" className="max-w-md">
      <ChildrenWidget childLabel="Issues" items={ISSUES} defaultOpenKey="i2" onNavigate={noop} />
    </div>
  ),
}

// Variant_AtIssue: Issue → SubTasks.
export const Variant_AtIssue = {
  render: () => (
    <div data-ui="organism.children-widget.at-issue" className="max-w-md">
      <ChildrenWidget childLabel="SubTasks" items={SUBTASKS} onNavigate={noop} />
    </div>
  ),
}

// State_Empty: keine Kinder → Leer-Hinweis.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.children-widget.empty" className="max-w-md">
      <ChildrenWidget childLabel="Sprints" items={[]} />
    </div>
  ),
}
