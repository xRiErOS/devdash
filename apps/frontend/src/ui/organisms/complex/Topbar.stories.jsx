/**
 * Topbar — obere Shell-Leiste. Komponiert Breadcrumb + CommandBar + IconButton.
 * data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import Topbar from './Topbar.jsx'

const BREADCRUMB = [
  { label: 'devd2' },
  { label: 'DD#49', kind: 'sprint' },
  { label: 'DD2-7', kind: 'issue', last: true },
]

const meta = {
  title: '04 ORGANISMS/Topbar',
  component: Topbar,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: { commandPlaceholder: { control: 'text' } },
  args: {
    breadcrumb: BREADCRUMB,
    commandPlaceholder: 'Suchen, springen, Befehl …',
    shortcut: ['⌘', 'K'],
  },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="organism.topbar.default" className="bg-[var(--base)]">
      <Topbar {...args} dataUiScope="organism.topbar.default.bar" />
    </div>
  ),
}
