/**
 * FormField — betiteltes Eingabe-Wrapping. Komponiert Input/Textarea als children.
 * data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import FormField from './FormField.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'

const meta = {
  title: '03 MOLECULES/FormField',
  component: FormField,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    htmlFor: { control: 'text' },
  },
  args: { label: 'Titel', htmlFor: 'ff-title' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="molecule.formField.default" className="max-w-sm">
      <FormField {...args} dataUiScope="molecule.formField.default.field">
        <Input id={args.htmlFor} placeholder="Issue-Titel …" dataUiScope="molecule.formField.default.input" />
      </FormField>
    </div>
  ),
}

// Komposition mit verschiedenen Eingabe-Atomen (Input + Textarea).
export const WithTextarea = {
  render: () => (
    <div data-ui="molecule.formField.compose" className="flex flex-col gap-[var(--space-4)] max-w-sm">
      <FormField label="Titel" htmlFor="ff-c-title" dataUiScope="molecule.formField.title">
        <Input id="ff-c-title" placeholder="Kurzer Titel" dataUiScope="molecule.formField.title.input" />
      </FormField>
      <FormField label="Beschreibung" htmlFor="ff-c-desc" dataUiScope="molecule.formField.desc">
        <Textarea id="ff-c-desc" rows={3} placeholder="Was ist zu tun?" />
      </FormField>
    </div>
  ),
}
