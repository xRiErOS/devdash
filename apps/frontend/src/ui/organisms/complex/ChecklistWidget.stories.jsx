/**
 * ChecklistWidget — abhakbare Kriterien (volle Breite). Achse: collapsed.
 * Komponiert WidgetBase + ListItem + Checkbox + IconButton. data-ui je Teil.
 * 0 inline-style / 0 Raw-Hex.
 */
import ChecklistWidget from './ChecklistWidget.jsx'

const ITEMS = [
  { id: 'AC-1', name: 'Allowlist-Host case-insensitive matchen', done: true },
  { id: 'AC-2', name: 'Non-Capture-Routes liefern 403', done: true },
  { id: 'AC-3', name: 'Regressionstest dd375 grün', done: false },
  { id: 'AC-4', name: 'Doku im Security-Abschnitt ergänzt', done: false },
]

const meta = {
  title: '04 ORGANISMS/ChecklistWidget',
  component: ChecklistWidget,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { collapsed: { control: 'boolean' }, title: { control: 'text' } },
  args: { items: ITEMS, title: 'Akzeptanzkriterien', collapsed: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-2xl">
      <ChecklistWidget {...args} dataUiScope="organism.widget.checklist.default" />
    </div>
  ),
}

export const Collapsed = {
  render: () => (
    <div className="max-w-2xl">
      <ChecklistWidget items={ITEMS} collapsed dataUiScope="organism.widget.checklist.collapsed" />
    </div>
  ),
}
