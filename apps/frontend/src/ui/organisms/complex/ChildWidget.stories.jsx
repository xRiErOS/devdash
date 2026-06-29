/**
 * ChildWidget — Kind-Issues-Liste (volle Breite). Achse: collapsed.
 * Komponiert WidgetBase + ListItem + EntityId + StatusDot + Icon. data-ui je Teil.
 * 0 inline-style / 0 Raw-Hex.
 */
import ChildWidget from './ChildWidget.jsx'

const ITEMS = [
  { id: 'DD2-7', type: 'core', name: 'Capture-Host härten', status: 'in_progress', statusLabel: 'In Arbeit' },
  { id: 'DD2-8', type: 'feature', name: 'Render-Smoke erweitern', status: 'new', statusLabel: 'Offen' },
  { id: 'DD2-9', type: 'bug', name: 'Roadmap-Reorder DnD', status: 'to_review', statusLabel: 'Review' },
  { id: 'DD2-11', type: 'improvement', name: 'Memory-Tag-Prune', status: 'completed', statusLabel: 'Completed' },
]

const meta = {
  title: '04 ORGANISMS/ChildWidget',
  component: ChildWidget,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { collapsed: { control: 'boolean' }, title: { control: 'text' } },
  args: { items: ITEMS, title: 'Issues', collapsed: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-2xl">
      <ChildWidget {...args} dataUiScope="organism.widget.children.default" />
    </div>
  ),
}

export const Collapsed = {
  render: () => (
    <div className="max-w-2xl">
      <ChildWidget items={ITEMS} collapsed dataUiScope="organism.widget.children.collapsed" />
    </div>
  ),
}
