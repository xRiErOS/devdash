/**
 * Input — einzeiliges Text-Atom (Pendant zu Textarea). Achse: disabled.
 * data-ui je Wrapper + Instanz. 0 inline-style / 0 Raw-Hex.
 */
import Input from './Input.jsx'

const meta = {
  title: '02 ATOMS/Input',
  component: Input,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: { placeholder: 'Titel …', disabled: false },
}
export default meta

export const Default = {
  render: (args) => <Input {...args} dataUiScope="atom.input.default" />,
}

export const Disabled = {
  render: () => (
    <div data-ui="atom.input.disabled" className="max-w-sm">
      <Input placeholder="deaktiviert" disabled dataUiScope="atom.input.off" />
    </div>
  ),
}
