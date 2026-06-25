/**
 * GF-286 — StatusBadgeSelect (05.20 Actions, Q01). Badge + Auswahl-Menü als EINE
 * interaktive Funktion: das Status-Badge ist der Trigger, ein Klick öffnet nur die
 * erlaubten Übergänge. Löst die StatusBadge↔StatusPillSelect-Redundanz in
 * EntityItem (EI-6). Organism (offen/zu-State + Transition-Auswahl).
 *
 * Präsentational: `allowedStatuses` + `onChange` kommen vom Consumer (Lifecycle-
 * Validierung bleibt autoritativ beim Backend). data-ui je Wrapper/Trigger/Option.
 * GF-351: Composition-Achse ergänzt (Row-Kontext).
 */
import StatusBadgeSelect from '../../../components/ui/organisms/StatusBadgeSelect.jsx'

const noop = () => {}

// Beispiel: aus 'active' sind 'review' und 'cancelled' valide Ziele.
const ALLOWED = ['active', 'review', 'done', 'cancelled']

const meta = {
  title: '05 ORGANISMS/05.20 Actions/StatusBadgeSelect',
  component: StatusBadgeSelect,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    status: {
      control: 'select',
      options: ['new', 'refined', 'active', 'review', 'done', 'cancelled'],
      description: 'Aktueller Status (Trigger-Badge).',
    },
    defaultOpen: { control: 'boolean', description: 'Menü initial offen (Story/SSR).' },
    disabled: { control: 'boolean' },
  },
  args: {
    status: 'active',
    allowedStatuses: ALLOWED,
    defaultOpen: false,
    disabled: false,
  },
}
export default meta

// Default: Minimal-Zustand — nur Status (strukturell nötig), Default-Props sonst.
export const Default = {
  args: { status: 'new', allowedStatuses: [], defaultOpen: false, disabled: false },
  render: (args) => (
    <div data-ui="organism.status-badge-select.default" className="min-h-[12rem]">
      <StatusBadgeSelect {...args} onChange={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall mit voller Demo-Bestückung (offenes Menü, erlaubte Übergänge).
export const Main = {
  render: () => (
    <div data-ui="organism.status-badge-select.main" className="min-h-[12rem]">
      <StatusBadgeSelect status="active" allowedStatuses={ALLOWED} defaultOpen onChange={noop} />
    </div>
  ),
}

// Variant_States = geschlossen (nur Trigger) · offen (Menü mit erlaubten Übergängen) · disabled.
export const Variant_States = {
  render: () => (
    <div data-ui="organism.status-badge-select.states" className="flex items-start gap-10 min-h-[14rem]">
      <div data-ui="organism.status-badge-select.state-closed">
        <StatusBadgeSelect status="active" allowedStatuses={ALLOWED} onChange={noop} />
      </div>
      <div data-ui="organism.status-badge-select.state-open">
        <StatusBadgeSelect status="active" allowedStatuses={ALLOWED} onChange={noop} defaultOpen />
      </div>
      <div data-ui="organism.status-badge-select.state-disabled">
        <StatusBadgeSelect status="review" allowedStatuses={ALLOWED} onChange={noop} disabled />
      </div>
    </div>
  ),
}

// Composition: Row-Kontext — StatusBadgeSelect eingebettet in eine Issue-Zeile
// (Trigger-Badge als Inline-Status-Aktion innerhalb einer Liste/Tabelle).
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.status-badge-select.composition" className="flex flex-col gap-2 max-w-lg min-h-[18rem]">
      <div data-ui="organism.status-badge-select.composition-row-active" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--text)]">DD-42 · StatusBadgeSelect Story ergänzen</span>
        <div data-ui="organism.status-badge-select.composition-badge-active">
          <StatusBadgeSelect status="active" allowedStatuses={ALLOWED} onChange={noop} />
        </div>
      </div>
      <div data-ui="organism.status-badge-select.composition-row-review" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--text)]">DD-43 · Composition-Achse GF-351</span>
        <div data-ui="organism.status-badge-select.composition-badge-review">
          <StatusBadgeSelect status="review" allowedStatuses={['done', 'active']} onChange={noop} />
        </div>
      </div>
      <div data-ui="organism.status-badge-select.composition-row-done" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--text)] opacity-60">DD-44 · Abgeschlossenes Issue</span>
        <div data-ui="organism.status-badge-select.composition-badge-done">
          <StatusBadgeSelect status="done" allowedStatuses={[]} onChange={noop} disabled />
        </div>
      </div>
    </div>
  ),
}
