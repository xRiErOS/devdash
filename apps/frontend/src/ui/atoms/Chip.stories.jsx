/**
 * Chip — klickbares Filter-Pill. Achse: active. data-ui je Wrapper + Instanz.
 * 0 inline-style / 0 Raw-Hex.
 */
import Chip from './Chip.jsx'

const meta = {
  title: '02 ATOMS/Chip',
  component: Chip,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { active: { control: 'boolean' }, children: { control: 'text' } },
  args: { active: false, children: 'P2' },
}
export default meta

export const Default = {
  render: (args) => <Chip {...args} dataUiScope="atom.chip.default" />,
}

// Prioritäts-Reihe wie im Filter-Menü — P2 ausgewählt.
export const Row = {
  render: () => (
    <div data-ui="atom.chip.row" className="flex gap-[var(--space-1)]">
      {['P1', 'P2', 'P3', 'P4'].map((p) => (
        <Chip key={p} active={p === 'P2'} dataUiScope={`atom.chip.${p}`}>{p}</Chip>
      ))}
    </div>
  ),
}
