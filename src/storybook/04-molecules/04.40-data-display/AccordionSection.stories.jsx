/**
 * AccordionSection — Molecule-Story (04.40 Data Display). Section-Disclosure (Marker
 * ▸/▾ + [NN] + Titel + Hint) mit animiertem Panel. Der Panel-Inhalt ist eine
 * AccordionBody (1/2/3 Reihen, je 2fr/1fr-Slots; Titel im Slot, Inhalt titellos).
 * Variationen: 1 Row · 2 Rows · 3 Rows · zwei kombinierte Sections.
 */
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import AccordionSection from '../../../components/ui/molecules/AccordionSection.jsx'
import AccordionBody from '../../../components/ui/molecules/AccordionBody.jsx'

const noop = () => {}
const box = 'max-w-2xl rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--surface0)]'

// Titelloser Daten-Platzhalter.
function Data() {
  return <div className="rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--surface2)_28%,transparent)] p-3 text-center text-[11px] text-[var(--overlay1)]">titelloses Daten-Widget</div>
}

// AccordionBody mit n Reihen; 1 Reihe → slot-…, mehrere → section-n-… .
function Body({ rows = 1 }) {
  const list = Array.from({ length: rows }).map((_, i) => ({
    left: { title: rows === 1 ? 'beschreibung' : `section-${i + 1}-left`, content: <Data /> },
    right: { title: rows === 1 ? 'metadaten' : `section-${i + 1}-right`, content: <Data /> },
  }))
  return <AccordionBody rows={list} />
}

function OneSection({ scope, title = 'Issue Details', hint = 'Slots mit Titel', rows = 1, initial = true }) {
  const [open, setOpen] = useState(initial)
  return (
    <div data-ui={scope} className={box}>
      <AccordionSection no="01" title={title} hint={hint} open={open} onToggle={() => setOpen((o) => !o)} panelId="as-1"><Body rows={rows} /></AccordionSection>
    </div>
  )
}

const meta = {
  title: '04 MOLECULES/04.40 Data Display/AccordionSection',
  component: AccordionSection,
  tags: ['status:stable', 'qa_behavioral:done'],
  parameters: {
    docs: { description: { component: 'Terminal-Section-Disclosure (EntityDetail V2). Controlled, grid-rows-Animation, JetBrains Mono. Panel-Inhalt = AccordionBody (1–N Reihen, Titel im Slot).' } },
  },
}
export default meta

export const Default = {
  render: () => <OneSection scope="molecule.accordion-section.default" />,
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (eine Section,
// 1 Reihe), da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: () => <OneSection scope="molecule.accordion-section.main" hint="Beschreibung + Metadaten" rows={1} />,
}

// States: offen + geschlossen (Marker/aria-expanded/Panel-Sichtbarkeit).
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.accordion-section.states" className={box}>
      <AccordionSection no="01" title="Offen" hint="aufgeklappt" open onToggle={noop} panelId="st-1"><Body rows={1} /></AccordionSection>
      <AccordionSection no="02" title="Geschlossen" hint="eingeklappt" open={false} onToggle={noop} panelId="st-2"><Body rows={1} /></AccordionSection>
    </div>
  ),
}

export const Variant_OneRow = { name: '1 Row', render: () => <OneSection scope="molecule.accordion-section.one-row" title="1 Row" rows={1} /> }
export const Variant_TwoRows = { name: '2 Rows', render: () => <OneSection scope="molecule.accordion-section.two-rows" title="2 Rows" rows={2} /> }
export const Variant_ThreeRows = { name: '3 Rows', render: () => <OneSection scope="molecule.accordion-section.three-rows" title="3 Rows" rows={3} /> }

// Combined: zwei AccordionSections gestapelt (unabhängiger Open-State).
function CombinedDemo() {
  const [open, setOpen] = useState({ a: true, b: false })
  const t = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  return (
    <div data-ui="molecule.accordion-section.combined" className={box}>
      <AccordionSection no="01" title="Issue Details" hint="2 Reihen" open={open.a} onToggle={() => t('a')} panelId="cmb-a"><Body rows={2} /></AccordionSection>
      <AccordionSection no="02" title="Beziehungen" hint="1 Reihe" open={open.b} onToggle={() => t('b')} panelId="cmb-b"><Body rows={1} /></AccordionSection>
    </div>
  )
}

export const Variant_Combined = { name: '2 Sections kombiniert', render: () => <CombinedDemo /> }

// Interaction_KeyboardNav (PO-R3 / a11y): WAI-ARIA Roving-Focus über die Geschwister-
// Header. Drei Sections, die mittlere disabled → muss aus der Tastatur-Nav fallen.
// ↓ überspringt disabled + wrappt am Ende, ↑ wrappt am Anfang, Home/End springen.
export const Interaction_KeyboardNav = {
  name: 'Interaction — Keyboard-Nav',
  render: () => (
    <div data-ui="molecule.accordion-section.keyboard-nav" className={box}>
      <AccordionSection no="01" title="Erste" open onToggle={noop} panelId="kb-1"><Body rows={1} /></AccordionSection>
      <AccordionSection no="02" title="Gesperrt" disabled open={false} onToggle={noop} panelId="kb-2"><Body rows={1} /></AccordionSection>
      <AccordionSection no="03" title="Dritte" open={false} onToggle={noop} panelId="kb-3"><Body rows={1} /></AccordionSection>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const triggers = [...canvasElement.querySelectorAll('[data-ui="accordion-section.trigger"]')]
    expect(triggers).toHaveLength(3)
    expect(triggers[1]).toBeDisabled() // mittlere Section ist aus der Nav gefiltert

    triggers[0].focus()
    expect(triggers[0]).toHaveFocus()

    // ↓ vom ersten → überspringt die disabled Section auf die dritte
    await userEvent.keyboard('{ArrowDown}')
    expect(triggers[2]).toHaveFocus()

    // ↓ vom letzten → Wrap zurück auf den ersten
    await userEvent.keyboard('{ArrowDown}')
    expect(triggers[0]).toHaveFocus()

    // ↑ vom ersten → Wrap auf den letzten (disabled übersprungen)
    await userEvent.keyboard('{ArrowUp}')
    expect(triggers[2]).toHaveFocus()

    // Home → erster, End → letzter
    await userEvent.keyboard('{Home}')
    expect(triggers[0]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(triggers[2]).toHaveFocus()
  },
}

// Interaction_Toggle: Trigger-Klick feuert onToggle (controlled) und flippt
// aria-expanded am Header (stateful Harness reflektiert den Open-State zurück).
function ToggleHarness({ onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div data-ui="molecule.accordion-section.toggle" className={box}>
      <AccordionSection
        no="01"
        title="Toggle"
        hint="Klick togglet"
        open={open}
        onToggle={() => { onToggle?.(); setOpen((o) => !o) }}
        panelId="tg-1"
      >
        <Body rows={1} />
      </AccordionSection>
    </div>
  )
}

export const Interaction_Toggle = {
  name: 'Interaction — Toggle',
  args: { onToggle: fn() },
  render: (args) => <ToggleHarness onToggle={args.onToggle} />,
  play: async ({ args, canvasElement }) => {
    const trigger = canvasElement.querySelector('[data-ui="accordion-section.trigger"]')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(args.onToggle).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  },
}
