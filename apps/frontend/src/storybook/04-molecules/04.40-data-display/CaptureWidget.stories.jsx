/**
 * CaptureWidget — Molecule-Story (04.40 Data Display). Layout-Grundlage erfassender
 * Widgets: 4 optionale Toolbar-Slots (search/sort/filter/create), body, 1–3 Metriken
 * rechtsbündig unten. DEFAULT RANDLOS (fügt sich in randlose EntityDetails-WidgetSlots);
 * `framed` = Rahmen + Tönung für Standalone. Mono, token-clean.
 */
import CaptureWidget from '../../../components/ui/molecules/CaptureWidget.jsx'
import IconButton from '../../../components/ui/atoms/IconButton.jsx'
import SearchField from '../../../components/ui/molecules/SearchField.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

// Titelloser body-Platzhalter (nur Füll-Tönung).
function Body() {
  return (
    <div className="space-y-1 text-[12px] text-[var(--text)]">
      <div>[x] erstes Kriterium</div>
      <div>[ ] zweites Kriterium</div>
      <div>[ ] drittes Kriterium</div>
    </div>
  )
}

const CreateBtn = <IconButton icon={<Icon name="add" label="Erfassen" />} label="Erfassen" size="sm" variant="ghost" />
const Progress = <span data-ui="demo.progress">1/3 erfüllt</span>

// Demo-Toolbar-Controls (mono, token-clean) für FullToolbar.
// Such-Slot = echtes SearchField (Molekül), ghost (surface=transparent) + xs (compact).
const Search = (
  <SearchField
    placeholder="// suche"
    surface="transparent"
    className="[&_input]:py-1 [&_input]:text-[12px]"
  />
)
const Sort = <IconButton icon={<Icon name="sort" label="Sortieren" />} label="Sortieren" size="sm" variant="ghost" />
const Filter = <IconButton icon={<Icon name="filter" label="Filtern" />} label="Filtern" size="sm" variant="ghost" />

const meta = {
  title: '04 MOLECULES/04.40 Data Display/CaptureWidget',
  component: CaptureWidget,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: randlos, nur create-Slot + 1 Metrik (typischer DoD-Einsatz).
export const Default = {
  render: () => (
    <div data-ui="molecule.capture-widget.default">
      <CaptureWidget createSlot={CreateBtn} metrics={[Progress]}>
        <Body />
      </CaptureWidget>
    </div>
  ),
}

// Framed: optionaler Rahmen + Tönung (Standalone).
export const Variant_Framed = {
  render: () => (
    <div data-ui="molecule.capture-widget.framed">
      <CaptureWidget framed createSlot={CreateBtn} metrics={[Progress]}>
        <Body />
      </CaptureWidget>
    </div>
  ),
}

// Main (Pflicht): alle 4 Slots (search/sort/filter/create) — die realistisch voll
// ausgestattete Toolbar als maßgeblicher Hauptfall.
export const Main = {
  name: 'Full Toolbar',
  render: () => (
    <div data-ui="molecule.capture-widget.full-toolbar">
      <CaptureWidget
        searchSlot={Search}
        sortSlot={Sort}
        filterSlot={Filter}
        createSlot={CreateBtn}
        metrics={[Progress]}
      >
        <Body />
      </CaptureWidget>
    </div>
  ),
}

// NoToolbar: nur body + Metriken (keine Toolbar gerendert).
export const Variant_NoToolbar = {
  name: 'No Toolbar',
  render: () => (
    <div data-ui="molecule.capture-widget.no-toolbar">
      <CaptureWidget metrics={[Progress]}>
        <Body />
      </CaptureWidget>
    </div>
  ),
}

// Scoped: parametrisierter data-ui-Bereich (`dataUiScope`) — erlaubt Mehrfach-Instanzen
// in einem Composer ohne Anker-Kollision (z.B. AttachmentsAndMemories: 3× CaptureWidget).
export const Variant_Scoped = {
  render: () => (
    <div data-ui="molecule.capture-widget.scoped">
      <CaptureWidget dataUiScope="x-widget" searchSlot={Search} createSlot={CreateBtn} metrics={[Progress]}>
        <Body />
      </CaptureWidget>
    </div>
  ),
}
