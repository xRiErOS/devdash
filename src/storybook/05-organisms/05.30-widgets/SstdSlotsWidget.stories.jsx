import SstdSlotsWidget from '../../../components/ui/organisms/SstdSlotsWidget.jsx'

const KEYS = [
  ['architecture', 'Architektur'],
  ['conventions', 'Konventionen'],
  ['sprint_state', 'Sprint-Stand'],
  ['roadmap', 'Roadmap'],
  ['cross_refs', 'Querverweise'],
  ['misc', 'Sonstiges'],
]

const FULL = [
  { key: 'architecture', label: 'Architektur', contentMd: 'Express **5** + better-sqlite3 + `ws`. SQLite NAS-Master.' },
  { key: 'conventions', label: 'Konventionen', contentMd: 'Conventional Commits, logische Utilities `ps-/pe-`, 0 Roh-Hex.' },
  { key: 'sprint_state', label: 'Sprint-Stand', contentMd: 'ProjectPages **S2** läuft — TodoWidget done, SstdSlots in Arbeit.' },
  { key: 'roadmap', label: 'Roadmap', contentMd: '- S2 Widgets\n- S3 SOPs + Tabs' },
  { key: 'cross_refs', label: 'Querverweise', contentMd: 'project_memory 567, ADR gf2-D01..D13.' },
  { key: 'misc', label: 'Sonstiges', contentMd: 'Backend-Track T-be1/3/4 OUT-OF-GF2.' },
]
const JOURNAL = ['T2 TodoWidget done (a7de72a)', 'T3 SstdSlotsWidget in Arbeit', 'PO-Drift: slot.sessionnotes raus']

const MINIMAL = KEYS.map(([key, label]) => ({ key, label, contentMd: key === 'sprint_state' ? 'S2 läuft.' : '' }))
const ALL_EMPTY = KEYS.map(([key, label]) => ({ key, label, contentMd: '' }))

export default {
  title: '05 ORGANISMS/05.30 Widgets/SstdSlotsWidget',
  component: SstdSlotsWidget,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'padded' },
}

// Default = Root-Minimal: 6 Slots, nur sprint_state befüllt, kein Journal.
export const Default = {
  name: 'SstdSlotsWidget (Root-Minimal)',
  render: (a) => <div data-ui="organism.sstd-slots.default"><SstdSlotsWidget {...a} /></div>,
  args: { slots: MINIMAL, journal: [] },
}

// Main = realistischer Hauptfall: alle 6 Slots befüllt + Journal-Projektion.
export const Main = {
  name: 'SstdSlotsWidget (Hauptfall)',
  render: (a) => <div data-ui="organism.sstd-slots.main"><SstdSlotsWidget {...a} /></div>,
  args: { slots: FULL, journal: JOURNAL },
}

export const State_Empty = {
  name: 'SstdSlotsWidget (alle Slots leer)',
  render: (a) => <div data-ui="organism.sstd-slots.state-empty"><SstdSlotsWidget {...a} /></div>,
  args: { slots: ALL_EMPTY, journal: [] },
}
