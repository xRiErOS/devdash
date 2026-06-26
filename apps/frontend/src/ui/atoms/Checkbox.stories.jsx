/**
 * Checkbox — abhakbares Kästchen. Achse: checked. data-ui je Wrapper + Instanz.
 * 0 inline-style / 0 Raw-Hex.
 */
import Checkbox from './Checkbox.jsx'

const meta = {
  title: '02 ATOMS/Checkbox',
  component: Checkbox,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { checked: { control: 'boolean' }, label: { control: 'text' } },
  args: { checked: false, label: 'Akzeptanzkriterium' },
}
export default meta

export const Default = {
  render: (args) => <Checkbox {...args} dataUiScope="atom.checkbox.default" />,
}

// Beide Zustände — abgehakt vs. offen.
export const States = {
  render: () => (
    <div data-ui="atom.checkbox.states" className="flex flex-col gap-[var(--space-2)]">
      <Checkbox checked label="Allowlist case-insensitive" dataUiScope="atom.checkbox.done" />
      <Checkbox label="Regressionstest dd375 grün" dataUiScope="atom.checkbox.open" />
    </div>
  ),
}
