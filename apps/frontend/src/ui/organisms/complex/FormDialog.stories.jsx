/**
 * FormDialog — modaler Eingabe-Dialog über Dim-Scrim. Komponiert IconButton +
 * FormField(Input/Textarea) + SegmentedControl + Button. Über Demo-Hintergrund.
 * 0 inline-style / 0 Raw-Hex.
 */
import FormDialog from './FormDialog.jsx'

const FIELDS = [
  { label: 'Titel', type: 'input', value: 'Regressionstest dd375 grün' },
  { label: 'Beschreibung', type: 'textarea', placeholder: 'Kurzbeschreibung des Kriteriums …' },
]

const meta = {
  title: '04 ORGANISMS/FormDialog',
  component: FormDialog,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    primaryLabel: { control: 'text' },
    priority: { control: 'select', options: ['P1', 'P2', 'P3', 'P4'] },
  },
  args: {
    title: 'Neues Akzeptanzkriterium',
    fields: FIELDS,
    primaryLabel: 'Speichern',
    priority: 'P2',
  },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="relative bg-[var(--base)] min-h-[480px] p-6">
      <FormDialog {...args} dataUiScope="organism.formDialog.default" />
    </div>
  ),
}
