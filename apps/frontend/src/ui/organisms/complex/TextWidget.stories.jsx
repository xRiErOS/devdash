/**
 * TextWidget — Beschreibungs-Widget. Achse: collapsed. Komponiert WidgetBase +
 * Section + IconButton. data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import TextWidget from './TextWidget.jsx'

const VALUE = {
  goal: 'Capture-PWA darf ausschließlich Issues anlegen — alles andere 403.',
  background: '`issues.*` liegt hinter Authelia; App-Guard prüft Host + Route gegen die Allowlist.',
  description: 'Host-Match case-insensitive, Allowlist zentral, neue PWA-Calls explizit freigeben.',
}

const meta = {
  title: '04 ORGANISMS/TextWidget',
  component: TextWidget,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { collapsed: { control: 'boolean' } },
  args: { value: VALUE, collapsed: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <TextWidget {...args} dataUiScope="organism.widget.text.default" />
    </div>
  ),
}

export const Collapsed = {
  render: () => (
    <div className="max-w-md">
      <TextWidget value={VALUE} collapsed dataUiScope="organism.widget.text.collapsed" />
    </div>
  ),
}
