/**
 * WidgetBase — Accordion-Container. Achsen: collapsed, hue, count, action.
 * Komponiert IconButton (Aktion/Caret). data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import WidgetBase from './WidgetBase.jsx'
import IconButton from '../atoms/IconButton.jsx'

const meta = {
  title: '03 MOLECULES/WidgetBase',
  component: WidgetBase,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    hue: { control: 'inline-radio', options: ['yellow', 'teal', 'green', 'mauve', 'peach'] },
    collapsed: { control: 'boolean' },
    count: { control: 'text' },
  },
  args: { title: 'Beschreibung', hue: 'yellow', collapsed: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <WidgetBase
        {...args}
        dataUiScope="molecule.widget.default"
        action={<IconButton iconName="edit" label="Bearbeiten" size="sm" dataUiScope="molecule.widget.default.edit" />}
      >
        <p className="text-sm text-[var(--subtext1)]">Body-Inhalt — beliebige Children.</p>
      </WidgetBase>
    </div>
  ),
}

// Offen vs. eingeklappt (Caret + Body-Sichtbarkeit + Kopf-Trennlinie).
export const Collapsed = {
  render: () => (
    <div className="flex flex-col gap-[var(--space-3)] max-w-md">
      <WidgetBase title="Issues" count="4" dataUiScope="molecule.widget.open"
        action={<IconButton iconName="add" label="Issue anlegen" size="sm" dataUiScope="molecule.widget.open.add" />}>
        <p className="text-sm text-[var(--subtext1)]">offen → Body sichtbar</p>
      </WidgetBase>
      <WidgetBase title="Akzeptanzkriterien" count="2 offen" collapsed dataUiScope="molecule.widget.collapsed"
        action={<IconButton iconName="add" label="Kriterium hinzufügen" size="sm" dataUiScope="molecule.widget.collapsed.add" />}>
        <p className="text-sm text-[var(--subtext1)]">eingeklappt → Body weg</p>
      </WidgetBase>
    </div>
  ),
}
