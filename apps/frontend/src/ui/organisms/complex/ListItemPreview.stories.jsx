/**
 * ListItemPreview — Push-Panel (Spec §5). Achsen: Elementtyp (Issue/Sprint/
 * Milestone) → passender Detail-Organismus; Breitenstufe (default/compact).
 * Daten kommen aus den Fixtures der Detail-Organismen (data undefined).
 */
import ListItemPreview from './ListItemPreview.jsx'

const meta = {
  title: '04 ORGANISMS/ListItemPreview',
  component: ListItemPreview,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => (
  <div data-ui="organism.listItemPreview.story" className="flex h-[560px] bg-[var(--base)]">
    <div className="flex-1 border-r border-[var(--border)] p-[var(--space-3)] text-[12px] text-[var(--subtext0)]">Liste (Platzhalter)</div>
    {children}
  </div>
)

export const Issue = {
  render: () => (
    <Frame>
      <ListItemPreview open type="issue" size="default" />
    </Frame>
  ),
}

export const Sprint = {
  render: () => (
    <Frame>
      <ListItemPreview open type="sprint" size="default" />
    </Frame>
  ),
}

export const Milestone = {
  render: () => (
    <Frame>
      <ListItemPreview open type="milestone" size="default" />
    </Frame>
  ),
}

export const Compact = {
  render: () => (
    <Frame>
      <ListItemPreview open type="issue" size="compact" />
    </Frame>
  ),
}
