/**
 * ElementRow — reiche Listenzeile (Spec §4.3/§4.4). Achsen: kind, caret, selected,
 * focused (Roving-Fokus), gesetzte/fehlende Priorität.
 */
import ElementRow from './ElementRow.jsx'

const meta = {
  title: '03 MOLECULES/ElementRow',
  component: ElementRow,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

const Frame = ({ children }) => (
  <div data-ui="molecule.elementRow.story" className="w-[640px] bg-[var(--base)] p-[var(--space-2)]">{children}</div>
)

export const IssueDefault = {
  render: () => (
    <Frame>
      <ElementRow kind="issue" issueType="feature" entityId="DD2-7" title="Project-Switcher im Header verdrahten" status="in_progress" priority={1} />
    </Frame>
  ),
}

export const Minimal = {
  render: () => (
    <Frame>
      <ElementRow kind="issue" issueType="core" entityId="DD2-10" title="Ohne Priorität — kein Leerraum" status="new" />
    </Frame>
  ),
}

export const Selected = {
  render: () => (
    <Frame>
      <ElementRow kind="issue" issueType="bug" entityId="DD2-8" title="Selektiert + aktives Preview-Ziel" status="to_review" priority={1} selected active />
    </Frame>
  ),
}

export const Focused = {
  render: () => (
    <Frame>
      <ElementRow kind="issue" issueType="feature" entityId="DD2-7" title="Roving-Fokus (Pfeiltasten) — ring-Markierung" status="in_progress" priority={2} focused tabbable={false} />
    </Frame>
  ),
}

export const NestedParents = {
  render: () => (
    <Frame>
      <ElementRow kind="milestone" entityId="M3" title="Meilenstein (aufgeklappt)" status="in_progress" priority={1} level={0} caret="open" />
      <ElementRow kind="sprint" entityId="DD2#49" title="Sprint (zugeklappt)" status="in_progress" priority={2} level={1} caret="closed" />
      <ElementRow kind="issue" issueType="feature" entityId="DD2-7" title="Issue auf Ebene 2" status="in_progress" priority={1} level={2} />
    </Frame>
  ),
}
