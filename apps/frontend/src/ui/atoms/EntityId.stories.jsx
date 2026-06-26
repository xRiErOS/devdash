/**
 * EntityId — farbcodierte Entitäts-ID. Achsen: kind (issue/sprint/milestone),
 * Größe erbt vom Kontext. data-ui je Wrapper + Instanz (PO-Ansprechbarkeit).
 * 0 inline-style / 0 Raw-Hex.
 */
import EntityId from './EntityId.jsx'

const meta = {
  title: '02 ATOMS/EntityId',
  component: EntityId,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['issue', 'sprint', 'milestone'], description: 'Entitäts-Art → Farbe (entityHue).' },
    tone: { control: 'inline-radio', options: [undefined, 'peach', 'mauve', 'sapphire', 'subtext0'], description: 'Expliziter Ton, überschreibt die kind-Hue (z.B. Roadmap-Slug in Peach).' },
    children: { control: 'text', description: 'ID-Text.' },
  },
  args: { kind: 'issue', children: 'DD2-7' },
}
export default meta

export const Default = {
  render: (args) => <EntityId {...args} dataUiScope="atom.entityId.default" />,
}

// Alle drei Entitäts-Arten nebeneinander — die Farbe trägt die Bedeutung.
export const Kinds = {
  render: () => (
    <div data-ui="atom.entityId.kinds" className="flex items-center gap-[var(--space-4)] text-sm">
      <EntityId kind="issue" dataUiScope="atom.entityId.issue">DD2-7</EntityId>
      <EntityId kind="sprint" dataUiScope="atom.entityId.sprint">DD#49</EntityId>
      <EntityId kind="milestone" dataUiScope="atom.entityId.milestone">M3</EntityId>
    </div>
  ),
}

// Expliziter Ton: Nicht-Entity-IDs (z.B. der Roadmap-Projekt-Slug im PageTitle)
// nutzen `tone` statt `kind` — hier Peach.
export const Tone = {
  render: () => (
    <div data-ui="atom.entityId.tone" className="flex items-center gap-[var(--space-4)] text-xl">
      <EntityId tone="peach" dataUiScope="atom.entityId.tone.peach">devd2</EntityId>
      <EntityId tone="mauve" dataUiScope="atom.entityId.tone.mauve">devd2</EntityId>
    </div>
  ),
}

// Größe erbt: dieselbe Komponente klein (Tree) und groß (Page-Title).
export const InheritsSize = {
  render: () => (
    <div data-ui="atom.entityId.sizes" className="flex items-baseline gap-[var(--space-4)]">
      <span className="text-[11px]"><EntityId kind="issue" dataUiScope="atom.entityId.small">DD2-7</EntityId></span>
      <span className="text-xl"><EntityId kind="issue" dataUiScope="atom.entityId.large">DD2-7</EntityId></span>
    </div>
  ),
}
