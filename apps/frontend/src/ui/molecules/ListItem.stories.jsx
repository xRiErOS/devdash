/**
 * ListItem — generische Listenzeile. Achsen: grip, active, struck.
 * Komponiert EntityId/StatusDot/Icon bzw. Checkbox als children. 0 inline / 0 Hex.
 */
import ListItem from './ListItem.jsx'
import EntityId from '../atoms/EntityId.jsx'
import StatusDot from '../atoms/StatusDot.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import Icon from '../foundations/Icon.jsx'

const meta = {
  title: '03 MOLECULES/ListItem',
  component: ListItem,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    grip: { control: 'boolean' },
    active: { control: 'boolean' },
    struck: { control: 'boolean' },
  },
  args: { grip: true, active: false, struck: false },
}
export default meta

// Genau die Zeile, die SprintCard im Wide-Mode für `sprint.issues[]` rendert
// (EntityId 11px + StatusDot + truncatender Titel) — eine Quelle, kein Drift.
const SPRINT_ISSUES = [
  { key: 'DD2-41', title: 'Token-Layer härten', status: 'in_progress' },
  { key: 'DD2-42', title: 'Render-Smoke-Netz spannen und grün halten', status: 'to_review' },
  { key: 'DD2-50', title: 'Promote: _mockups → src/ui', status: 'refined' },
]

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <ListItem {...args} dataUiScope="molecule.listItem.default">
        <Icon name="type-feature" size={14} mono />
        <EntityId kind="issue" dataUiScope="molecule.listItem.default.id">DD2-7</EntityId>
        <span className="flex-1 text-sm text-[var(--text)]">Storybook-Samen umsetzen</span>
        <StatusDot status="in_progress" label="In Arbeit" dataUiScope="molecule.listItem.default.status" />
      </ListItem>
    </div>
  ),
}

// Issue-Zeile (grip + EntityId + StatusDot) vs. Checklisten-Zeile (Checkbox).
export const Variants = {
  render: () => (
    <div data-ui="molecule.listItem.variants" className="flex flex-col gap-[var(--space-2)] max-w-md">
      <ListItem grip dataUiScope="molecule.listItem.issue">
        <Icon name="type-bug" size={14} mono />
        <EntityId kind="issue" dataUiScope="molecule.listItem.issue.id">DD2-8</EntityId>
        <span className="flex-1 text-sm text-[var(--text)]">Render-Smoke grün halten</span>
        <StatusDot status="refined" label="Refined" dataUiScope="molecule.listItem.issue.status" />
      </ListItem>
      <ListItem active dataUiScope="molecule.listItem.active">
        <Icon name="type-feature" size={14} mono />
        <EntityId kind="issue" dataUiScope="molecule.listItem.active.id">DD2-9</EntityId>
        <span className="flex-1 text-sm text-[var(--text)]">Aktive Zeile</span>
        <StatusDot status="in_progress" label="In Arbeit" dataUiScope="molecule.listItem.active.status" />
      </ListItem>
      <ListItem struck dataUiScope="molecule.listItem.check">
        <Checkbox checked label={<span className="line-through text-[var(--subtext0)]">Tokens dokumentiert</span>} dataUiScope="molecule.listItem.check.box" />
      </ListItem>
    </div>
  ),
}

// Importierte Variante: die Issue-Zeile der SprintCard-Wide-Liste (#5 — folgt
// jetzt dem normalen ListItem-Layout statt rohem <li>).
export const SprintIssueRow = {
  render: () => (
    <div data-ui="molecule.listItem.sprintIssue" className="flex flex-col gap-[var(--space-1)] max-w-md">
      {SPRINT_ISSUES.map((it, i) => (
        <ListItem key={it.key} dataUiScope={`molecule.listItem.sprintIssue.item-${i}`} className="py-1">
          <EntityId kind="issue" dataUiScope={`molecule.listItem.sprintIssue.item-${i}.id`} className="shrink-0 text-[11px]">
            {it.key}
          </EntityId>
          <StatusDot status={it.status} label={it.status} dataUiScope={`molecule.listItem.sprintIssue.item-${i}.status`} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--subtext1)]" title={it.title}>
            {it.title}
          </span>
        </ListItem>
      ))}
    </div>
  ),
}
