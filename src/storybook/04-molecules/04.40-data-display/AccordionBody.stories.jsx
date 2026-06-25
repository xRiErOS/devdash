/**
 * AccordionBody — Molecule-Story (04.40 Data Display). 2fr/1fr-Slot-Container, ein- oder
 * mehrreihig. Der Titel gehört in den Slot (AccordionBody rendert ihn als SubHeading,
 * CommentLabel-Nachfolger nach Retire); der eingesetzte Inhalt ist titellos. Slots randlos.
 */
import AccordionBody from '../../../components/ui/molecules/AccordionBody.jsx'

// Titelloser Slot-Inhalt (nur Füll-Tönung) — der Titel kommt aus dem Slot.
function Data() {
  return <div className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--surface2)_28%,transparent)] p-3 text-center text-[11px] text-[var(--overlay1)]">titelloses Daten-Widget</div>
}

const meta = {
  title: '04 MOLECULES/04.40 Data Display/AccordionBody',
  component: AccordionBody,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

const wrap = 'rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--surface0)]'

// Default: minimaler Default-Props-Zustand (no-args) — leere Einzelreihe, kein Slot-Inhalt.
export const Default = {
  render: () => (
    <div data-ui="molecule.accordion-body.default" className={wrap}>
      <AccordionBody />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (Einzelreihe,
// beschreibung/metadaten), da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: () => (
    <div data-ui="molecule.accordion-body.main" className={wrap}>
      <AccordionBody left={{ title: 'beschreibung', content: <Data /> }} right={{ title: 'metadaten', content: <Data /> }} />
    </div>
  ),
}

// 1 Row: explizit via rows → slot-left / slot-right.
export const Variant_OneRow = {
  name: '1 Row',
  render: () => (
    <div data-ui="molecule.accordion-body.one-row" className={wrap}>
      <AccordionBody rows={[{ left: { title: 'slot-left', content: <Data /> }, right: { title: 'slot-right', content: <Data /> } }]} />
    </div>
  ),
}

// 2 Rows: section-1-… / section-2-… (mehr als 2 Elemente nestbar).
export const Variant_TwoRow = {
  name: '2 Rows',
  render: () => (
    <div data-ui="molecule.accordion-body.two-row" className={wrap}>
      <AccordionBody rows={[
        { left: { title: 'section-1-left', content: <Data /> }, right: { title: 'section-1-right', content: <Data /> } },
        { left: { title: 'section-2-left', content: <Data /> }, right: { title: 'section-2-right', content: <Data /> } },
      ]} />
    </div>
  ),
}

// 3 Rows: wie 2 plus section-3-… .
export const Variant_ThreeRow = {
  name: '3 Rows',
  render: () => (
    <div data-ui="molecule.accordion-body.three-row" className={wrap}>
      <AccordionBody rows={[
        { left: { title: 'section-1-left', content: <Data /> }, right: { title: 'section-1-right', content: <Data /> } },
        { left: { title: 'section-2-left', content: <Data /> }, right: { title: 'section-2-right', content: <Data /> } },
        { left: { title: 'section-3-left', content: <Data /> }, right: { title: 'section-3-right', content: <Data /> } },
      ]} />
    </div>
  ),
}
