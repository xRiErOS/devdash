/**
 * GF-249-Muster — SortDialog (05.60 Overlay, OR-10). Schwester des FilterDialog,
 * kleinerer Scope: Sort-Feld + Richtung. Stateful (Sort-Entwurf bis Apply).
 *
 * Ebene-6 (OR-10) — Capability-Gegencheck:
 * | CAP | Verb | frontend | Anmerkung |
 * |---|---|---|---|
 * | CAP-issue-list | issue/list | 🟢 present | sortieren — Achsen aus list-fähigen Feldern |
 *
 * Richtungs-Toggle = zwei Button-Atome (SegmentBar ist Display-Balken, kein Control).
 * data-ui je Feld + dir-asc/desc + apply/reset (T01).
 */
import SortDialog from '../../../components/ui/organisms/SortDialog.jsx'

const noop = () => {}

const fields = [
  { value: 'created', label: 'Erstellt' },
  { value: 'updated', label: 'Aktualisiert' },
  { value: 'priority', label: 'Priorität' },
  { value: 'title', label: 'Titel' },
  { value: 'status', label: 'Status' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/SortDialog',
  component: SortDialog,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    direction: { control: 'inline-radio', options: ['asc', 'desc'] },
    onApply: { action: 'apply' },
    onReset: { action: 'reset' },
    onClose: { action: 'close' },
  },
  args: {
    open: true,
    fields,
    sortBy: 'created',
    direction: 'asc',
  },
}
export default meta

// Default: minimaler No-Args-Zustand — Komponenten-Default-Props (open=undefined, fields=[]).
export const Default = {
  args: {},
  render: (args) => (
    <div data-ui="organism.sort-dialog.default">
      <SortDialog {...args} onApply={noop} onReset={noop} onClose={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.sort-dialog.main">
      <SortDialog {...args} onApply={noop} onReset={noop} onClose={noop} />
    </div>
  ),
}

// States = aufsteigend (created/asc) vs. absteigend nach Priorität — aktives Feld + Richtung sichtbar.
// GF-349: Sub-Anker state-asc / state-desc für PO-adressierbare Zustände (Canon-Regel 1).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.sort-dialog.states" className="flex flex-col gap-4">
      <div data-ui="organism.sort-dialog.state-asc">
        <SortDialog
          open
          fields={fields}
          sortBy="created"
          direction="asc"
          onApply={noop}
          onReset={noop}
          onClose={noop}
        />
      </div>
      <div data-ui="organism.sort-dialog.state-desc">
        <SortDialog
          open
          fields={fields}
          sortBy="priority"
          direction="desc"
          onApply={noop}
          onReset={noop}
          onClose={noop}
        />
      </div>
    </div>
  ),
}
