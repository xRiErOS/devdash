/**
 * MasterDetailEntryTitle — Molecule-Story (04.40 Data Display, GF-2 T03 DD-Review).
 * Zentraler Titel-Kopf eines im Detail-Pane geöffneten Eintrags: EntityPill (ID) +
 * truncate-Titel links, Aktions-Slot rechts. Slot-Design für tool-weite
 * Wiederverwendung (BacklogPage + künftige Master-Detail-Screens).
 *
 * PRESENTATIONAL: props-driven, Aktionen via Slot/Callback delegiert. data-ui je
 * Wrapper + Element (Komponente trägt `master-detail-entry-title.*`).
 */
import { fn } from 'storybook/test'
import MasterDetailEntryTitle from '../../../components/ui/molecules/MasterDetailEntryTitle.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const meta = {
  title: '04 MOLECULES/04.40 Data Display/MasterDetailEntryTitle',
  component: MasterDetailEntryTitle,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

const OpenAction = (
  <Button variant="ghost" size="sm" leadingIcon={<Icon name="external" size={14} />}>
    Vollständig öffnen
  </Button>
)

// Default: minimaler Fall — ID + Titel, ohne Aktionen.
export const Default = {
  render: () => (
    <div data-ui="molecule.master-detail-entry-title.default" className="max-w-2xl">
      <MasterDetailEntryTitle id="DD-1" entity="issue" title="Issue-Titel im Detail-Pane" />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Fall — klickbare ID + Aktions-Slot rechts.
export const Main = {
  render: () => (
    <div data-ui="molecule.master-detail-entry-title.main" className="max-w-2xl">
      <MasterDetailEntryTitle
        id="DD-137"
        entity="issue"
        title="Backlog-Row aus BacklogPage extrahieren"
        onIdClick={fn()}
        actions={OpenAction}
      />
    </div>
  ),
}

// Variant_LongTitle: sehr langer Titel → truncate, Aktions-Slot bleibt sichtbar.
export const Variant_LongTitle = {
  render: () => (
    <div data-ui="molecule.master-detail-entry-title.long-title" className="max-w-md">
      <MasterDetailEntryTitle
        id="DD-220"
        entity="issue"
        title="Ein sehr langer Issue-Titel, der den verfügbaren Platz überschreitet und sauber abgeschnitten werden muss"
        onIdClick={fn()}
        actions={OpenAction}
      />
    </div>
  ),
}

// Variant_NoId: ohne ID-Pille (nur Titel) — z.B. Entitäten ohne Key.
export const Variant_NoId = {
  render: () => (
    <div data-ui="molecule.master-detail-entry-title.no-id" className="max-w-2xl">
      <MasterDetailEntryTitle title="Eintrag ohne ID-Key" actions={OpenAction} />
    </div>
  ),
}

// Variant_Composition: andere Entität (Sprint) — gleiche Chrome, andere Pill-Farbe.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.master-detail-entry-title.composition" className="max-w-2xl">
      <MasterDetailEntryTitle id="DD#20" entity="sprint" title="Frontend-Rework Phase 3" onIdClick={fn()} actions={OpenAction} />
    </div>
  ),
}
