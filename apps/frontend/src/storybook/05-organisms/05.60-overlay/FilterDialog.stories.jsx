/**
 * GF-248-Muster — FilterDialog (05.60 Overlay, OR-09). Erster stateful Organism:
 * hält den Filter-Entwurf bis Apply. Komponiert ModalShell + DialogHeader/Footer +
 * Checkbox (Achsen) + TagChip (Tag-Mehrfachauswahl).
 *
 * Ebene-6 (OR-09) — Capability-Gegencheck:
 * | CAP | Verb | frontend | Anmerkung |
 * |---|---|---|---|
 * | CAP-issue-list | issue/list | 🟢 present | Backlog filtern (Status/Type/Priority) |
 * | CAP-tag-filter | tag/filter | 🟢 present | Issues nach Tag(s) filtern |
 *
 * Beide Caps present → echte Filter-Achsen. data-ui je Achse + apply/reset (T01).
 */
import FilterDialog from '../../../components/ui/organisms/FilterDialog.jsx'

const noop = () => {}

const statusOptions = [
  { value: 'new', label: 'Neu' },
  { value: 'refined', label: 'Refined' },
  { value: 'active', label: 'Aktiv' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]
const typeOptions = [
  { value: 'feat', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'chore', label: 'Chore' },
]
const priorityOptions = [
  { value: 'high', label: 'Hoch' },
  { value: 'medium', label: 'Mittel' },
  { value: 'low', label: 'Niedrig' },
]
const tagOptions = [
  { value: 'frontend', label: 'frontend' },
  { value: 'backend', label: 'backend' },
  { value: 'design', label: 'design' },
  { value: 'security', label: 'security' },
]
// FD-1: Zeitraum-Achse (dateRange) — relative Presets (kein roher Date-Input).
const dateRangeOptions = [
  { value: 'last7', label: 'Letzte 7 Tage' },
  { value: 'last30', label: 'Letzte 30 Tage' },
  { value: 'sprint', label: 'Aktueller Sprint' },
  { value: 'all', label: 'Gesamter Zeitraum' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/FilterDialog',
  component: FilterDialog,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    onApply: { action: 'apply' },
    onReset: { action: 'reset' },
    onClose: { action: 'close' },
  },
  args: {
    open: true,
    statusOptions,
    typeOptions,
    priorityOptions,
    tagOptions,
    dateRangeOptions,
  },
}
export default meta

// Default: args-getrieben — minimaler no-args-Zustand (keine Achsen-Optionen, Default-Props).
export const Default = {
  args: {
    statusOptions: [],
    typeOptions: [],
    priorityOptions: [],
    tagOptions: [],
    dateRangeOptions: [],
  },
  render: (args) => (
    <div data-ui="organism.filter-dialog.default">
      <FilterDialog {...args} onApply={noop} onReset={noop} onClose={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.filter-dialog.main">
      <FilterDialog {...args} onApply={noop} onReset={noop} onClose={noop} />
    </div>
  ),
}

// States = leerer Entwurf vs. vorausgewählter Filter (checked Checkboxen + selektierte Tags).
// GF-349: Sub-Anker state-preselected für den vorausgewählten Zustand (Canon-Regel 1).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.filter-dialog.states" className="flex flex-col gap-4">
      <div data-ui="organism.filter-dialog.state-empty">
        <FilterDialog
          open
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          priorityOptions={priorityOptions}
          tagOptions={tagOptions}
          dateRangeOptions={dateRangeOptions}
          onApply={noop}
          onReset={noop}
          onClose={noop}
        />
      </div>
      <div data-ui="organism.filter-dialog.state-preselected">
        <FilterDialog
          open
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          priorityOptions={priorityOptions}
          tagOptions={tagOptions}
          dateRangeOptions={dateRangeOptions}
          value={{ status: ['active', 'review'], type: ['bug'], priority: ['high'], tags: ['frontend', 'security'], dateRange: 'last30' }}
          onApply={noop}
          onReset={noop}
          onClose={noop}
        />
      </div>
    </div>
  ),
}

// Composition = volle Achsen-Komposition (alle fünf Achsen inkl. Zeitraum + Footer), Anker-Set für PO.
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.filter-dialog.composition">
      <FilterDialog
        open
        statusOptions={statusOptions}
        typeOptions={typeOptions}
        priorityOptions={priorityOptions}
        tagOptions={tagOptions}
        dateRangeOptions={dateRangeOptions}
        value={{ status: ['new'], type: [], priority: ['medium'], tags: ['design'], dateRange: 'sprint' }}
        onApply={noop}
        onReset={noop}
        onClose={noop}
      />
    </div>
  ),
}
