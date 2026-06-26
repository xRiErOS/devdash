/**
 * ProjectBrowser — linke Struktur-Spalte. Achse: collapsed (offen ↔ Streifen).
 * Komponiert CommandBar + IconButton + SegmentedControl + TreeRow. data-ui je
 * Teil. 0 inline-style / 0 Raw-Hex.
 */
import ProjectBrowser from './ProjectBrowser.jsx'

const TREE = [
  { indent: 0, caret: 'open', id: 'M2', idKind: 'milestone', lead: 'Project Home' },
  { indent: 1, caret: 'open', id: 'DD#49', idKind: 'sprint', lead: 'Capture-Sprint' },
  { indent: 2, id: 'DD2-7', idKind: 'issue', label: 'Capture-Host härten', active: true },
  { indent: 2, id: 'DD2-8', idKind: 'issue', label: 'Render-Smoke erweitern' },
  { indent: 1, caret: 'closed', id: 'DD#50', idKind: 'sprint', lead: 'Mobile-Sprint' },
  { indent: 0, caret: 'closed', id: 'M3', idKind: 'milestone', lead: 'Mobile-Track' },
]

const meta = {
  title: '04 ORGANISMS/ProjectBrowser',
  component: ProjectBrowser,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: { collapsed: { control: 'boolean' } },
  args: { tree: TREE, view: 'struktur', collapsed: false },
}
export default meta

export const Open = {
  render: (args) => (
    <div data-ui="organism.projectBrowser.open" className="flex h-[480px] bg-[var(--base)]">
      <ProjectBrowser {...args} collapsed={false} dataUiScope="organism.projectBrowser.open.panel" />
    </div>
  ),
}

export const Collapsed = {
  render: (args) => (
    <div data-ui="organism.projectBrowser.collapsed" className="flex h-[480px] bg-[var(--base)]">
      <ProjectBrowser {...args} collapsed dataUiScope="organism.projectBrowser.collapsed.panel" />
    </div>
  ),
}
