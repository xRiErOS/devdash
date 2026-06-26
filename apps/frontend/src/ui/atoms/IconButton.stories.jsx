/**
 * IconButton — Icon-only-Aktion. Achsen: on (aktiv), size (md/sm).
 * data-ui je Wrapper + Instanz. 0 inline-style / 0 Raw-Hex.
 */
import IconButton from './IconButton.jsx'

const meta = {
  title: '02 ATOMS/IconButton',
  component: IconButton,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    iconName: { control: 'text' },
    label: { control: 'text' },
    on: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
  },
  args: { iconName: 'filter', label: 'Filter', on: false, size: 'md' },
}
export default meta

export const Default = {
  render: (args) => <IconButton {...args} dataUiScope="atom.iconButton.default" />,
}

// Zustände: neutral, aktiv (on), klein (sm).
export const States = {
  render: () => (
    <div data-ui="atom.iconButton.states" className="flex items-center gap-[var(--space-3)]">
      <IconButton iconName="edit" label="Bearbeiten" dataUiScope="atom.iconButton.edit" />
      <IconButton iconName="filter" label="Filter" on dataUiScope="atom.iconButton.filterOn" />
      <IconButton iconName="download" label="Download" size="sm" dataUiScope="atom.iconButton.download" />
    </div>
  ),
}
