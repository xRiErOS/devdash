import { fn } from 'storybook/test'
import SessionNotesWidget from '../../../components/ui/organisms/SessionNotesWidget.jsx'

const NOTES = [
  {
    id: 'sn-1',
    title: 'S2 TodoWidget realisiert',
    detailMd: 'WidgetBase-Slot-Widget mit **Copy-ID** + Markdown-Anriss. Gates grün.',
    pr: 'https://github.com/x/y/pull/148',
    sprints: ['DD#47'],
    issues: ['DD-678', 'GF-433'],
  },
  {
    id: 'sn-2',
    title: 'PO-Drift S1→S2 geklärt',
    detailMd: 'slot.sessionnotes raus aus ProjectHome (wie SSTD); Tab-Wiring → S3.',
    issues: ['GF-413'],
  },
  {
    id: 'sn-3',
    title: 'Klassifikator OVERRIDE_V2',
    detailMd: 'TodoWidget/SessionNotes ohne Terminal-Marker → OVERRIDE_V2 via ddc auf main.',
    pr: 'https://github.com/x/y/pull/149',
    sprints: ['DD#47'],
  },
]

export default {
  title: '05 ORGANISMS/05.30 Widgets/SessionNotesWidget',
  component: SessionNotesWidget,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'padded' },
  args: { onSearch: fn(), onSelect: fn() },
}

// Default = Root-Minimal: eine Notiz, kein PR/Chips, keine Auswahl.
export const Default = {
  name: 'SessionNotesWidget (Root-Minimal)',
  render: (a) => <div data-ui="organism.session-notes.default"><SessionNotesWidget {...a} /></div>,
  args: { notes: [{ id: 'sn-1', title: 'Erste Notiz', detailMd: 'Kurzer Eintrag.' }], query: '' },
}

// Main = realistischer Hauptfall: mehrere Notizen mit PR + Sprint/Issue-Chips, eine gewählt.
export const Main = {
  name: 'SessionNotesWidget (Hauptfall)',
  render: (a) => <div data-ui="organism.session-notes.main"><SessionNotesWidget {...a} /></div>,
  args: { notes: NOTES, query: '', selectedId: 'sn-1' },
}

export const State_Empty = {
  name: 'SessionNotesWidget (kein Treffer)',
  render: (a) => <div data-ui="organism.session-notes.state-empty"><SessionNotesWidget {...a} /></div>,
  args: { notes: [], query: 'kein-treffer' },
}

// Variant_Searching = aktiver Suchbegriff + gefilterte Teilmenge (Consumer-gefiltert).
export const Variant_Searching = {
  name: 'SessionNotesWidget (Suche aktiv)',
  render: (a) => <div data-ui="organism.session-notes.variant-searching"><SessionNotesWidget {...a} /></div>,
  args: { notes: [NOTES[0]], query: 'todowidget' },
}
