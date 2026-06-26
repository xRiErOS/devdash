/**
 * Textarea — mehrzeiliges Text-Atom (DD-56 Harvest). Achsen: rows, disabled.
 * data-ui je Wrapper + Instanz. 0 inline-style / 0 Raw-Hex.
 */
import Textarea from './Textarea.jsx'

const meta = {
  title: '02 ATOMS/Textarea',
  component: Textarea,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    rows: { control: { type: 'number', min: 1, max: 12 } },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: { rows: 3, placeholder: 'Beschreibung …', disabled: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.textarea.default" className="max-w-md">
      <Textarea {...args} />
    </div>
  ),
}

export const Disabled = {
  render: () => (
    <div data-ui="atom.textarea.disabled" className="max-w-md">
      <Textarea placeholder="deaktiviert" disabled />
    </div>
  ),
}
