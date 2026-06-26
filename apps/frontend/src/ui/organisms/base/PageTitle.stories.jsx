/**
 * PageTitle — Lead-Panel. Achsen: kind, status. Komponiert EntityId + StatusDot.
 * data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import PageTitle from './PageTitle.jsx'

const meta = {
  title: '04 ORGANISMS/PageTitle',
  component: PageTitle,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['issue', 'sprint', 'milestone'] },
    icon: { control: 'text', description: 'Registry-Icon vor der ID (Nicht-Entity-Köpfe).' },
    idTone: { control: 'inline-radio', options: [undefined, 'peach', 'mauve'], description: 'Expliziter ID-Ton statt kind-Hue.' },
    status: { control: 'text' },
  },
  args: {
    kind: 'issue', id: 'DD2-7', name: 'Capture-Host Allowlist härten',
    status: 'refined', statusLabel: 'Refined', meta: ['chore', 'P2', '3 Subtasks', 'akt. vor 2 h'],
  },
}
export default meta

export const Default = {
  render: (args) => <PageTitle {...args} dataUiScope="organism.pageTitle.default" />,
}

// Pro Entität: Key-Farbe + Status-Ton variieren.
export const PerEntity = {
  render: () => (
    <div data-ui="organism.pageTitle.perEntity" className="flex flex-col gap-[var(--space-3)]">
      <PageTitle kind="issue" id="DD2-7" name="Capture-Host härten" status="refined" statusLabel="Refined" meta={['chore', 'P2']} dataUiScope="organism.pageTitle.issue" />
      <PageTitle kind="sprint" id="DD#49" name="Capture-Sprint" status="active" statusLabel="Active" meta={['12 Issues']} dataUiScope="organism.pageTitle.sprint" />
      <PageTitle kind="milestone" id="M3" name="Mobile-Track" status="planning" statusLabel="Planning" meta={['4 Sprints']} dataUiScope="organism.pageTitle.milestone" />
    </div>
  ),
}

// Statusloser Nicht-Entity-Kopf: Icon + Projekt-Slug in Peach + Stats-Meta —
// die Roadmap-Zentrale (kein Lifecycle, kein farbcodierter Entity-Key).
export const RoadmapHead = {
  render: () => (
    <PageTitle
      icon="chevron-right"
      id="devd2"
      idTone="peach"
      name="Roadmap"
      meta={['gesamt: 9', 'finished: 1', 'wip: 7']}
      dataUiScope="organism.pageTitle.roadmap"
    />
  ),
}
