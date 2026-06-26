/**
 * EmptyState — Leerzustand, 3 Varianten (Spec §7 + error). Achse: `variant`.
 */
import EmptyState from './EmptyState.jsx'

const meta = {
  title: '02 ATOMS/EmptyState',
  component: EmptyState,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['empty', 'no-match', 'error'] },
  },
  args: { variant: 'empty' },
}
export default meta

export const Empty = {
  args: { variant: 'empty' },
  render: (args) => (
    <div data-ui="atom.emptyState.story.empty" className="w-[420px]">
      <EmptyState {...args} dataUiScope="atom.emptyState.empty" />
    </div>
  ),
}

export const NoMatch = {
  args: { variant: 'no-match' },
  render: (args) => (
    <div data-ui="atom.emptyState.story.noMatch" className="w-[420px]">
      <EmptyState {...args} dataUiScope="atom.emptyState.noMatch" />
    </div>
  ),
}

export const Error = {
  args: { variant: 'error' },
  render: (args) => (
    <div data-ui="atom.emptyState.story.error" className="w-[420px]">
      <EmptyState {...args} dataUiScope="atom.emptyState.error" />
    </div>
  ),
}
