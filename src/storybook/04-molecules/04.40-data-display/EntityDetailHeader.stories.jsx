/**
 * EntityDetailHeader — Molecule-Story (04.40 Data Display). Read-Only-Kopf der
 * EntityDetail V2: id/title + MetaTag-Pills + Goal als Untertitel-Zeile.
 */
import EntityDetailHeader from '../../../components/ui/molecules/EntityDetailHeader.jsx'

const PILLS = [
  { k: 'prio', value: 'hoch', tone: 'peach' },
  { k: 'status', value: 'active', tone: 'blue' },
  { k: 'type', value: 'feature', tone: 'mauve' },
]
const GOAL = 'Verdichtete Metadaten einer Entität als wiederverwendbares Card-Widget — Goal, Status und Kerndaten auf einen Blick.'

const meta = {
  title: '04 MOLECULES/04.40 Data Display/EntityDetailHeader',
  component: EntityDetailHeader,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

export const Default = {
  render: () => (
    <div data-ui="molecule.entity-detail-header.default" className="max-w-3xl">
      <EntityDetailHeader id="DD-251" title="MetaCardWidget" />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — voll befüllter Kopf mit Goal + Pills.
export const Main = {
  render: () => (
    <div data-ui="molecule.entity-detail-header.main" className="max-w-3xl">
      <EntityDetailHeader id="DD-251" title="MetaCardWidget" goal={GOAL} pills={PILLS} background="mantle" />
    </div>
  ),
}

// States: mit Goal vs. ohne Goal (kompakter Kopf).
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.entity-detail-header.states" className="max-w-3xl space-y-4">
      <EntityDetailHeader id="DD-251" title="Mit Goal" goal={GOAL} pills={PILLS} />
      <EntityDetailHeader id="DD-252" title="Ohne Goal" pills={PILLS} />
    </div>
  ),
}

// Backgrounds: alle vier background-Werte im Vergleich.
export const Variant_Backgrounds = {
  render: () => (
    <div data-ui="molecule.entity-detail-header.backgrounds" className="max-w-3xl space-y-4">
      {['transparent', 'crust', 'mantle', 'base'].map((bg) => (
        <EntityDetailHeader
          key={bg}
          id={`bg:${bg}`}
          title={`background="${bg}"`}
          goal="Hintergrundfarbe via background-Prop"
          pills={PILLS}
          background={bg}
        />
      ))}
    </div>
  ),
}

// Composition: andere Entität (Memory) — gleiche Chrome, andere Pills.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.entity-detail-header.composition" className="max-w-3xl">
      <EntityDetailHeader
        id="MEM-12"
        title="SSTD = DevDash-DB (Master)"
        goal="Architektur-Entscheidung: SSTD-Master liegt in der DevDash-DB."
        pills={[
          { k: 'category', value: 'architecture_decision', tone: 'mauve' },
          { k: 'anchor', value: 'D01', tone: 'peach' },
          { k: 'status', value: 'active', tone: 'blue' },
        ]}
      />
    </div>
  ),
}
