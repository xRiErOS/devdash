import { fn } from 'storybook/test'
import ActiveEntityCard from '../../../components/ui/molecules/ActiveEntityCard.jsx'

const MILESTONE = { id: 'MS-2', title: 'M2 Roadmap Foundation', goal: 'Schema + UI für Roadmap-Boards', pills: [{ k: 'status', value: 'aktiv' }] }
const SPRINT = { id: 'DD#41', title: 'Sprint Review-V2', goal: 'ReviewFlow + Components auf main', pills: [{ k: 'status', value: 'läuft' }] }

export default {
  title: '04 MOLECULES/04.40 Data Display/ActiveEntityCard',
  component: ActiveEntityCard,
  tags: ['status:review', 'domain:projects', 'design_version:v2'],
  args: { onToggle: fn() },
}

export const Default = { name: 'ActiveEntityCard (collapsed)', render: (a) => <div data-ui="molecule.active-entity-card.default"><ActiveEntityCard {...a} /></div>, args: { ...MILESTONE, open: false } }
export const Main = { name: 'ActiveEntityCard (expanded)', render: (a) => <div data-ui="molecule.active-entity-card.main"><ActiveEntityCard {...a} /></div>, args: { ...MILESTONE, open: true } }
export const Variant_Milestone = { name: 'Variant — Meilenstein', render: (a) => <div data-ui="molecule.active-entity-card.variant-milestone"><ActiveEntityCard {...a} /></div>, args: { ...MILESTONE, open: true } }
export const Variant_Sprint = { name: 'Variant — Sprint', render: (a) => <div data-ui="molecule.active-entity-card.variant-sprint"><ActiveEntityCard {...a} /></div>, args: { ...SPRINT, open: true } }
