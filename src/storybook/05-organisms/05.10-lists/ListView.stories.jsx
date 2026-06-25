/**
 * GF-244-Muster — ListView (05.10 Lists, OR-05, D03/D04). Die EINE kanonische
 * Listen-Familie: config-getrieben, komponiert ListActionBar + EntityItem[] +
 * BulkActionBar + EmptyState/Skeleton. Organism (Selektions-/Such-Orchestrierung;
 * Daten-Fetch bleibt Consumer/Screen, P3).
 *
 * Ebene-6 (OR-05) — Capability-Gegencheck:
 * | CAP | Verb | frontend | Anmerkung |
 * |---|---|---|---|
 * | CAP-issue-list | issue/list | 🟢 present | Backlog-Config |
 * | CAP-project-list | project/list | 🟢 present | EntityList-Config |
 * | CAP-project-sstd-read | project/read | 🟢 present | — |
 * | CAP-tag-list | tag/list | 🟢 present | Tag-Ergebnis-Config |
 * | CAP-trash-lost-issues | trash/list | 🔴 missing | Trash-Config DEFERRED → GF-280/sprint-06 (D02), kein Fake-Backend |
 * | CAP-trash-soft-delete-status | trash/filter | 🟡 partial | cancelled-Toggle (deferred mit Trash) |
 *
 * Reflow-Vertrag (D10-G): card↔row über Container-Query, token-gebundene Schwelle
 * (`--cq-md`). Im MDX dokumentiert. data-ui je Wrapper + Element.
 */
import ListView from '../../../components/ui/organisms/ListView.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}
const STATUS_OPTIONS = ['new', 'refined', 'active', 'review', 'done']

const TRIGGERS = [
  { id: 'filter', label: 'Filter', icon: <Icon name="filter" size={14} />, onTrigger: noop },
  { id: 'sort', label: 'Sortieren', icon: <Icon name="sort" size={14} />, onTrigger: noop },
  { id: 'transfer', label: 'Export', icon: <Icon name="share" size={14} />, onTrigger: noop },
]

const BULK = [
  { id: 'assign', label: 'Sprint zuweisen', icon: <Icon name="add" size={14} />, onAction: noop },
  { id: 'delete', label: 'Löschen', icon: <Icon name="delete" size={14} />, danger: true, onAction: noop },
]

const ISSUES = [
  { id: 'DD-12', name: 'Slug-Routing', status: 'active', allowedStatuses: STATUS_OPTIONS },
  { id: 'DD-13', name: 'Result-Guard', status: 'review', allowedStatuses: STATUS_OPTIONS },
  { id: 'DD-14', name: 'Capture-Host Allowlist', status: 'new', allowedStatuses: STATUS_OPTIONS },
]

const PROJECTS = [
  { id: 'mybaby', name: 'MyBaby Tracker', entity: 'neutral', status: 'active', allowedStatuses: STATUS_OPTIONS },
  { id: 'devd', name: 'Developer Dashboard', entity: 'neutral', status: 'active', allowedStatuses: STATUS_OPTIONS },
]

const BACKLOG_CONFIG = { entity: 'issue', scope: 'backlog', columns: ['id', 'name', 'progress', 'status'], allowedBulkActions: ['assign', 'delete'] }
const ENTITYLIST_CONFIG = { entity: 'neutral', scope: 'projects', columns: ['id', 'name', 'status'], allowedBulkActions: ['delete'] }
const TAG_CONFIG = { entity: 'issue', scope: 'tag-result', columns: ['id', 'name', 'status'], allowedBulkActions: ['assign'] }

const meta = {
  title: '05 ORGANISMS/05.10 Lists/ListView',
  component: ListView,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    layout: { control: 'inline-radio', options: ['card', 'row'] },
    loading: { control: 'boolean' },
    searchPlaceholder: { control: 'text' },
  },
  args: {
    config: BACKLOG_CONFIG,
    items: ISSUES,
    triggerActions: TRIGGERS,
    bulkActions: BULK,
    layout: 'card',
    loading: false,
    searchValue: '',
    searchPlaceholder: 'Backlog durchsuchen…',
    selectedIds: [],
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — leere Liste, nur strukturell nötige
// Config, keine Demo-Daten. Controls steuern layout/loading (autodocs-Primary).
export const Default = {
  args: {
    config: BACKLOG_CONFIG,
    items: [],
    triggerActions: [],
    bulkActions: [],
    layout: 'card',
    loading: false,
    searchValue: '',
    searchPlaceholder: 'Backlog durchsuchen…',
    selectedIds: [],
  },
  render: (args) => (
    <div data-ui="organism.list-view.default" className="max-w-3xl">
      <ListView {...args} onSearchChange={noop} onSearchClear={noop} onSelectChange={noop} onClearSelection={noop} />
    </div>
  ),
}

// Main: maßgeblich genutzte Gestalt — realistisch-befüllter Backlog-Hauptfall
// (eigene, volle Demo-Daten; entkoppelt von Default).
export const Main = {
  render: (args) => (
    <div data-ui="organism.list-view.main" className="max-w-3xl">
      <ListView
        {...args}
        config={BACKLOG_CONFIG}
        items={ISSUES}
        triggerActions={TRIGGERS}
        bulkActions={BULK}
        layout="card"
        searchPlaceholder="Backlog durchsuchen…"
        onSearchChange={noop}
        onSearchClear={noop}
        onSelectChange={noop}
        onClearSelection={noop}
      />
    </div>
  ),
}

// Variants: die kanonische Config-Familie — Backlog · EntityList · Tag-Ergebnis.
// Zeigt alle drei scope-Konfigurationen; layout folgt dem jeweiligen Anwendungsfall.
export const Variant_All = {
  render: () => (
    <div data-ui="organism.list-view.variants" className="flex flex-col gap-8 max-w-3xl">
      <div data-ui="organism.list-view.variant-backlog">
        <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">Backlog (issue, card)</p>
        <ListView config={BACKLOG_CONFIG} items={ISSUES} triggerActions={TRIGGERS} bulkActions={BULK} layout="card" onSearchChange={noop} onSelectChange={noop} />
      </div>
      <div data-ui="organism.list-view.variant-entitylist">
        <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">EntityList (projects, row)</p>
        <ListView config={ENTITYLIST_CONFIG} items={PROJECTS} triggerActions={TRIGGERS} bulkActions={BULK} layout="row" onSearchChange={noop} onSelectChange={noop} />
      </div>
      <div data-ui="organism.list-view.variant-tag">
        <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">Tag-Ergebnis (issue, card)</p>
        <ListView config={TAG_CONFIG} items={ISSUES} triggerActions={TRIGGERS} bulkActions={BULK} layout="card" onSearchChange={noop} onSelectChange={noop} />
      </div>
    </div>
  ),
}

// Appearance: card vs. row-Layout für dieselbe Backlog-Config.
// card = gestapelt (Rahmen + Fläche), row = tabellarisch (kompakt, keine Card-Shell).
// Der Wechsel erfolgt über den layout-Prop; im Produkt steuert eine Container-Query
// (D10-G, --cq-md) das intrinsische Reflow.
export const Variant_Appearance = {
  render: () => (
    <div data-ui="organism.list-view.appearance" className="flex flex-col gap-8 max-w-3xl">
      <div data-ui="organism.list-view.appearance-card">
        <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">layout = card</p>
        <ListView config={BACKLOG_CONFIG} items={ISSUES} triggerActions={TRIGGERS} layout="card" onSearchChange={noop} onSelectChange={noop} />
      </div>
      <div data-ui="organism.list-view.appearance-row">
        <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">layout = row</p>
        <ListView config={BACKLOG_CONFIG} items={ISSUES} triggerActions={TRIGGERS} layout="row" onSearchChange={noop} onSelectChange={noop} />
      </div>
    </div>
  ),
}

// States: Loading (Skeleton) + Empty (EmptyState-Molecule) + Trash-deferred-Hinweis.
// Trash-Config hängt an CAP-trash-lost-issues 🔴 (GF-280/sprint-06, D02); kein
// eigener Export mehr (war nicht-kanon) — Hinweis hier inline dokumentiert (GF-367).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.list-view.states" className="flex flex-col gap-8 max-w-3xl">
      <div data-ui="organism.list-view.state-loading">
        <ListView config={BACKLOG_CONFIG} items={[]} loading triggerActions={TRIGGERS} onSearchChange={noop} />
      </div>
      <div data-ui="organism.list-view.state-empty">
        <ListView
          config={BACKLOG_CONFIG}
          items={[]}
          triggerActions={TRIGGERS}
          onSearchChange={noop}
          empty={{ icon: <Icon name="backlog" size={24} />, title: 'Kein Issue gefunden', description: 'Passe Suche oder Filter an.' }}
        />
      </div>
      <div data-ui="organism.list-view.state-trash-deferred">
        <div className="rounded-md border border-dashed border-[var(--surface2)] bg-[var(--surface0)] p-4 text-sm text-[var(--subtext1)]">
          <p className="font-medium text-[var(--text)]">Trash-Config — deferred</p>
          <p>
            Die Trash-Variante (gelöschte/lost Issues) hängt an <code>CAP-trash-lost-issues</code> 🔴 missing
            und wird mit <strong>GF-280</strong> (sprint-06, OR-05 Trash-Config) gebaut. Kein Fake-Backend (D02).
          </p>
        </div>
      </div>
    </div>
  ),
}

// Selection: Select-Mode (EI-2) — Kopf trägt den Select-Toggle; der SelectAllModal
// (GF-292, R3-LAB-1) ist hier offen gezeigt (2/3 selektiert → indeterminate). Die
// BulkActionBar (LV-2) ist vollständig verdrahtet (Count + Auswahl-aufheben +
// allowedBulkActions-Buttons aus Config).
export const State_Selected = {
  render: () => (
    <div data-ui="organism.list-view.selection" className="max-w-3xl">
      <ListView
        config={BACKLOG_CONFIG}
        items={ISSUES}
        triggerActions={TRIGGERS}
        bulkActions={BULK}
        selectMode
        selectedIds={['DD-12', 'DD-13']}
        selectAllOpen
        onSelectChange={noop}
        onClearSelection={noop}
        onSearchChange={noop}
        onToggleSelectMode={noop}
        onToggleSelectAll={noop}
        onSelectAllClose={noop}
        onSelectAllConfirm={noop}
      />
    </div>
  ),
}

// Sizes (SZ-1, ListView-Teil): size sm|md|lg|xl reicht an alle EntityItems durch
// (Padding/Abstände skalieren). Dichte = Padding-Skalierung, KEIN Ausblenden von
// Inhalt — Power-Tool-Lesbarkeit bleibt über alle Stufen erhalten.
export const Variant_Sizes = {
  render: () => (
    <div data-ui="organism.list-view.sizes" className="flex flex-col gap-8 max-w-3xl">
      {['sm', 'md', 'lg', 'xl'].map((s) => (
        <div key={s} data-ui={`organism.list-view.size-${s}`}>
          <p className="mb-1 text-xs font-medium text-[var(--subtext0)]">size = {s}</p>
          <ListView config={BACKLOG_CONFIG} items={ISSUES} triggerActions={TRIGGERS} size={s} onSearchChange={noop} onSelectChange={noop} />
        </div>
      ))}
    </div>
  ),
}
