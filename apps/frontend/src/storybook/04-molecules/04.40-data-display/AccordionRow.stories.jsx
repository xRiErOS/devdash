/**
 * GF-240 — AccordionRow (04.40 Data Display, ML-15). Disclosure-Zeile: Trigger
 * (optionales Lead-Icon + Titel + Chevron) + Panel-Slot, der nur bei open rendert.
 *
 * Dumb (CONV-molecule-boundary): controlled — `open` ist Prop, `onToggle` der
 * Callback (Consumer/OR-22 besitzt den State). Die Stories zeigen die Zustände
 * args-/prop-getrieben (kein interner State, SSR-snapshot-stabil).
 */
import AccordionRow from '../../../components/ui/molecules/AccordionRow.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.40 Data Display/AccordionRow',
  component: AccordionRow,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    open: { control: 'boolean', description: 'aufgeklappt → Panel sichtbar, Chevron gedreht.' },
    disabled: { control: 'boolean' },
  },
  args: {
    title: 'Abhängigkeiten',
    open: false,
    disabled: false,
  },
}
export default meta

// Default: minimaler No-Args-Zustand — Default-Props der Komponente, kein Panel-Inhalt.
export const Default = {
  args: { title: '', open: false, disabled: false },
  render: (args) => (
    <div data-ui="molecule.accordion-row.default" className="max-w-md">
      <AccordionRow {...args} onToggle={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (args-getrieben),
// da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: (args) => (
    <div data-ui="molecule.accordion-row.main" className="max-w-md">
      <AccordionRow {...args} onToggle={noop}>
        <p>Panel-Inhalt erscheint nur bei <code>open</code>.</p>
      </AccordionRow>
    </div>
  ),
}

// State_Empty etc. N/A — die Zustände bündelt Variant_States.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.accordion-row.states" className="max-w-md">
      <div data-ui="molecule.accordion-row.state-closed">
        <AccordionRow title="Geschlossen" open={false} onToggle={noop}>
          <p>verstecktes Panel</p>
        </AccordionRow>
      </div>
      <div data-ui="molecule.accordion-row.state-open">
        <AccordionRow title="Offen" open onToggle={noop}>
          <p>Dieses Panel ist sichtbar, weil <code>open</code> gesetzt ist.</p>
        </AccordionRow>
      </div>
      <div data-ui="molecule.accordion-row.state-disabled">
        <AccordionRow title="Gesperrt" open={false} disabled onToggle={noop}>
          <p>nicht erreichbar</p>
        </AccordionRow>
      </div>
    </div>
  ),
}

// SplitNav: onTitleActivate gesetzt → der Titel ist ein eigener Klick-Bereich
// (Navigation), nur das Chevron toggelt das Panel (GF-296). Für OR-22 ChildrenWidget.
export const Variant_SplitNav = {
  render: () => (
    <div data-ui="molecule.accordion-row.split-nav" className="max-w-md">
      <div data-ui="molecule.accordion-row.split-nav-row">
        <AccordionRow title="DD-251 · MetaCard (Titel navigiert)" open onToggle={noop} onTitleActivate={noop}>
          <p>Chevron toggelt; Klick auf den Titel navigiert zur Detail-Page.</p>
        </AccordionRow>
      </div>
    </div>
  ),
}

// Composition: Lead-Icon (foundations) im Trigger + reichhaltiger Panel-Slot.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.accordion-row.composition" className="max-w-md">
      <div data-ui="molecule.accordion-row.composition-row">
        <AccordionRow
          title="Definition of Done"
          icon={<Icon name="checklist" size={16} mono />}
          open
          onToggle={noop}
        >
          <ul className="list-disc ps-5">
            <li>Tests grün</li>
            <li>Review abgenommen</li>
          </ul>
        </AccordionRow>
      </div>
    </div>
  ),
}
