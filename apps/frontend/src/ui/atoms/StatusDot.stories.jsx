/**
 * StatusDot — Status → Ton (Dot + Label). Achse: status (alle Lifecycle-Stati).
 * Töne = Spiegel der kanonischen STATUS_COLORS (lifecycle.js, D1).
 * data-ui je Wrapper + Instanz. 0 inline-style / 0 Raw-Hex.
 */
import StatusDot from './StatusDot.jsx'

const meta = {
  title: '02 ATOMS/StatusDot',
  component: StatusDot,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    status: {
      control: 'select',
      options: ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'done', 'cancelled'],
      description: 'Roher Lifecycle-Status → Ton via statusTone.',
    },
    label: { control: 'text' },
  },
  args: { status: 'refined', label: 'Refined' },
}
export default meta

export const Default = {
  render: (args) => <StatusDot {...args} dataUiScope="atom.statusDot.default" />,
}

// Issue-Lifecycle vollständig — jeder Status sein kanonischer Ton.
const ISSUE = [
  ['new', 'New'], ['refined', 'Refined'], ['planned', 'Planned'], ['in_progress', 'In Arbeit'],
  ['to_review', 'Review'], ['passed', 'Passed'], ['rejected', 'Rejected'], ['done', 'Done'], ['cancelled', 'Cancelled'],
]
export const IssueLifecycle = {
  render: () => (
    <div data-ui="atom.statusDot.issue" className="flex flex-col gap-[var(--space-2)]">
      {ISSUE.map(([status, label]) => (
        <StatusDot key={status} status={status} label={label} dataUiScope={`atom.statusDot.${status}`} />
      ))}
    </div>
  ),
}
