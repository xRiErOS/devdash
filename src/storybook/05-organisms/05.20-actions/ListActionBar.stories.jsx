/**
 * GF-246-Muster — ListActionBar (05.20 Actions, OR-07). Der Kopf der ListView:
 * SearchField + action-as-data-Trigger. Organism (komponiert Moleküle + trägt die
 * Such-/Trigger-Callbacks); der Filter-/Sort-State lebt in den Overlays/ListView.
 *
 * Ebene-6 (OR-07) — Capability-Gegencheck:
 * | CAP | Verb | frontend | Anmerkung |
 * |---|---|---|---|
 * | CAP-trash-soft-delete-status | trash/filter | 🟡 partial | cancelled-Status-Toggle; hier nur als Trigger (Filter-State im Overlay) |
 *
 * data-ui je Wrapper + je Trigger (PO-Ansprechbarkeit, T01).
 */
import ListActionBar from '../../../components/ui/organisms/ListActionBar.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const baseActions = [
  { id: 'filter', label: 'Filter', icon: <Icon name="filter" size={14} />, onTrigger: noop },
  { id: 'sort', label: 'Sortieren', icon: <Icon name="sort" size={14} />, onTrigger: noop },
  { id: 'transfer', label: 'Export', icon: <Icon name="share" size={14} />, onTrigger: noop },
]

const meta = {
  title: '05 ORGANISMS/05.20 Actions/ListActionBar',
  component: ListActionBar,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    searchValue: { control: 'text', description: 'Controlled Suchbegriff.' },
    searchPlaceholder: { control: 'text' },
    actions: { control: false, description: 'action-as-data: {id,label,icon,active,count,onTrigger}.' },
  },
  args: {
    searchValue: '',
    searchPlaceholder: 'Issues suchen…',
    actions: baseActions,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — leere actions, leere Suche (no-data).
export const Default = {
  args: {
    searchValue: '',
    actions: [],
  },
  render: (args) => (
    <div data-ui="organism.list-action-bar.default" className="max-w-3xl">
      <ListActionBar {...args} onSearchChange={noop} onSearchClear={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — voll befüllte Leiste (Suche + alle Trigger).
export const Main = {
  render: () => (
    <div data-ui="organism.list-action-bar.main" className="max-w-3xl">
      <ListActionBar
        searchValue=""
        searchPlaceholder="Issues suchen…"
        actions={baseActions}
        onSearchChange={noop}
        onSearchClear={noop}
      />
    </div>
  ),
}

// Variant_States = ohne aktive Filter (count 0) vs. mit aktiven Filtern (active + count-Badge).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.list-action-bar.states" className="flex flex-col gap-6 max-w-3xl">
      <div data-ui="organism.list-action-bar.state-idle">
        <ListActionBar actions={baseActions} onSearchChange={noop} onSearchClear={noop} />
      </div>
      <div data-ui="organism.list-action-bar.state-active">
        <ListActionBar
          searchValue="auth"
          onSearchChange={noop}
          onSearchClear={noop}
          actions={[
            { ...baseActions[0], active: true, count: 2 },
            { ...baseActions[1], active: true, count: 1 },
            baseActions[2],
          ]}
        />
      </div>
    </div>
  ),
}

// Variant_Composition = volle Leiste (Suche + alle drei Trigger), Default-Anker-Set für PO.
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.list-action-bar.composition" className="max-w-3xl">
      <ListActionBar
        searchValue=""
        searchPlaceholder="Backlog durchsuchen…"
        onSearchChange={noop}
        onSearchClear={noop}
        actions={baseActions}
      />
    </div>
  ),
}

// SelectMode (R3-LAB-1) = Select-Mode-Toggle (immer). Klick öffnet beim Consumer den
// SelectAllModal (GF-292) — die „Alle auswählen"-Steuerung lebt dort, nicht mehr
// inline. Zwei Zustände: inaktiv (Toggle nicht gedrückt) · aktiv (pressed, Akzent).
export const State_Selected = {
  render: () => (
    <div data-ui="organism.list-action-bar.select-mode" className="flex flex-col gap-6 max-w-3xl">
      <div data-ui="organism.list-action-bar.select-inactive">
        <ListActionBar actions={baseActions} onSearchChange={noop} onSearchClear={noop} onToggleSelectMode={noop} />
      </div>
      <div data-ui="organism.list-action-bar.select-active">
        <ListActionBar
          actions={baseActions}
          selectMode
          onSearchChange={noop}
          onSearchClear={noop}
          onToggleSelectMode={noop}
        />
      </div>
    </div>
  ),
}
