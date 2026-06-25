/**
 * GF-208-Muster — SearchField (04.10 Form, GF-233). Molecule: Input (Such-Icon
 * links) + Clear-IconButton (rechts, nur bei value). Dumb (CONV-molecule-boundary):
 * präsentational, keine Such-/Fetch-/Debounce-Logik — Consumer verdrahtet
 * value/onChange/onClear. data-ui je Story + je Element (T01).
 * GF-351: Composition-Achse ergänzt (leadingIcon-Slot-Kontext).
 */
import SearchField from '../../../components/ui/molecules/SearchField.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.10 Form/SearchField',
  component: SearchField,
  tags: ['status:review', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: 'text', description: 'Controlled Suchbegriff.' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    value: '',
    placeholder: 'Suchen…',
    disabled: false,
  },
}
export default meta

// Default: minimaler No-Args-Zustand — Default-Props, leeres value → kein Clear-Button.
export const Default = {
  args: {},
  render: () => (
    <div data-ui="molecule.search-field.default" className="max-w-xs">
      <SearchField onChange={noop} onClear={noop} />
    </div>
  ),
}

// Main = realistischer Hauptfall: aktive Such-Eingabe → Clear-Button sichtbar.
export const Main = {
  args: { value: 'Sprint', placeholder: 'Suchen…', disabled: false },
  render: (args) => (
    <div data-ui="molecule.search-field.main" className="max-w-xs">
      <SearchField {...args} onChange={noop} onClear={noop} />
    </div>
  ),
}

// States = leer (kein Clear) · gefüllt (Clear sichtbar) · gesperrt. Jede Achse
// mit eigenem data-ui zur 1:1-Ansprache.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.search-field.states" className="flex flex-col gap-3 max-w-xs">
      <div data-ui="molecule.search-field.empty">
        <SearchField value="" onChange={noop} onClear={noop} />
      </div>
      <div data-ui="molecule.search-field.filled">
        <SearchField value="Sprint" onChange={noop} onClear={noop} />
      </div>
      <div data-ui="molecule.search-field.disabled">
        <SearchField value="Sprint" disabled onChange={noop} onClear={noop} />
      </div>
    </div>
  ),
}

// Composition: leadingIcon-Slot-Kontext — SearchField als Toolbar-Element
// (leadingIcon ist fest eingebaut in SearchField.jsx als Search-Icon links;
// hier gezeigt: Feld in einer Toolbar-Leiste neben anderen Controls).
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.search-field.composition" className="flex flex-col gap-4 max-w-sm">
      <div data-ui="molecule.search-field.composition-toolbar" className="flex items-center gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <div data-ui="molecule.search-field.composition-input" className="flex-1">
          <SearchField value="Sprint" onChange={noop} onClear={noop} />
        </div>
      </div>
      <div data-ui="molecule.search-field.composition-standalone" className="flex flex-col gap-1">
        <span className="text-xs text-[var(--subtext0)]">Backlog-Suche</span>
        <div data-ui="molecule.search-field.composition-standalone-input">
          <SearchField value="" placeholder="Issues suchen…" onChange={noop} onClear={noop} />
        </div>
      </div>
    </div>
  ),
}
