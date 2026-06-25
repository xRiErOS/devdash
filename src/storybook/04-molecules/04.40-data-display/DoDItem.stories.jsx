/**
 * GF-241 — DoDItem (04.40 Data Display, ML-16). Definition-of-Done-Zeile:
 * Checkbox-Atom + Kriteriums-Text + optionaler Detail-IconButton. Komponiert von
 * OR-23 (DoD-Checklist).
 *
 * Dumb (CONV-molecule-boundary): controlled — `checked` ist Prop, `onToggle`/
 * `onDetail` sind Callbacks. Stories prop-getrieben (kein interner State).
 */
import DoDItem from '../../../components/ui/molecules/DoDItem.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.40 Data Display/DoDItem',
  component: DoDItem,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', name: 'text' },
    checked: { control: 'boolean', description: 'erfüllt → Checkbox an, Text durchgestrichen.' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Alle Tests grün',
    checked: false,
    disabled: false,
  },
}
export default meta

// Default: minimal — keine args, Komponente rendert mit Default-Props.
export const Default = {
  args: {},
  render: (args) => (
    <div data-ui="molecule.dod-item.default" className="max-w-md">
      <DoDItem {...args} onToggle={noop} onDetail={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — eigenständig befüllter Realfall.
export const Main = {
  render: () => (
    <div data-ui="molecule.dod-item.main" className="max-w-md">
      <DoDItem checked={false} disabled={false} onToggle={noop} onDetail={noop}>Alle Tests grün</DoDItem>
    </div>
  ),
}

// States: offen · erfüllt (durchgestrichen) · gesperrt · ohne Detail-Button.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.dod-item.states" className="max-w-md">
      <div data-ui="molecule.dod-item.state-open"><DoDItem checked={false} onToggle={noop} onDetail={noop}>Offenes Kriterium</DoDItem></div>
      <div data-ui="molecule.dod-item.state-checked"><DoDItem checked onToggle={noop} onDetail={noop}>Erfülltes Kriterium</DoDItem></div>
      <div data-ui="molecule.dod-item.state-disabled"><DoDItem checked={false} disabled onToggle={noop} onDetail={noop}>Gesperrtes Kriterium</DoDItem></div>
      <div data-ui="molecule.dod-item.state-no-detail"><DoDItem checked={false} onToggle={noop}>Ohne Detail-Button</DoDItem></div>
    </div>
  ),
}

// Composition: eine DoD-Checkliste (mehrere Items gestapelt).
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.dod-item.composition" className="max-w-md">
      <div data-ui="molecule.dod-item.item-story"><DoDItem checked onToggle={noop} onDetail={noop}>Story + MDX + Ref-Test geliefert</DoDItem></div>
      <div data-ui="molecule.dod-item.item-data-ui"><DoDItem checked onToggle={noop} onDetail={noop}>data-ui je Wrapper + Element</DoDItem></div>
      <div data-ui="molecule.dod-item.item-review"><DoDItem checked={false} onToggle={noop} onDetail={noop}>PO-Visual-Review abgenommen</DoDItem></div>
    </div>
  ),
}
