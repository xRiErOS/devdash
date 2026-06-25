/**
 * TagMultiSelect (04.10 Form) — kanonisches, token-sauberes Molecule, aus dem
 * Archiv extrahiert (DD-56 Harvest, Canon rule 12). Generisches Multi-Select über
 * eine Options-Liste: ARIA-Combobox (W3C) mit Pfeiltasten-Navigation, Enter-Commit,
 * Home/End, Backspace-Remove und Esc-Handoff. Komponiert die Atoms Pill (selektierte
 * Chips), Input (Such-Feld) und IconButton (Entfernen-× / Schliessen-×).
 *
 * Props-driven (CONV-molecule-boundary): kein Store/Fetch — der Consumer hält value
 * und verdrahtet onChange/onCreate/onEscape. data-ui je Story + je Element (T01).
 * Keyboard-Verhalten (Arrow/Enter/Backspace/Esc) ist im Interaction_Keyboard-Play
 * abgesichert (qa_behavioral:done); die statische Markup-Struktur im
 * gf-tag-multi-select-ref-Test.
 */
import { useState } from 'react'
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import TagMultiSelect from '../../../components/ui/molecules/TagMultiSelect.jsx'

const OPTIONS = [
  { value: 1, label: 'frontend', color: 'blue', meta: '12×' },
  { value: 2, label: 'backend', color: 'green', meta: '8×' },
  { value: 3, label: 'design', color: 'mauve', meta: '5×' },
  { value: 4, label: 'urgent', color: 'peach', meta: '3×' },
  { value: 5, label: 'docs', color: 'teal', meta: '2×' },
  { value: 6, label: 'chore', color: 'overlay0', meta: '1×' },
]

const noop = () => {}

// useState lebt in einer benannten Komponente (nicht in der anonymen render-Fn),
// damit react-hooks/rules-of-hooks nicht greift. Spiegelt einen Consumer wider.
function TagMultiSelectHarness({ initial = [], options = OPTIONS, ...args }) {
  const [value, setValue] = useState(initial)
  return (
    <div className="max-w-md">
      <TagMultiSelect {...args} options={options} value={value} onChange={setValue} />
    </div>
  )
}

const meta = {
  title: '04 MOLECULES/04.10 Form/TagMultiSelect',
  component: TagMultiSelect,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:done'],
  parameters: { layout: 'padded' },
  argTypes: {
    allowCreate: { control: 'boolean', description: 'Create-Suggestion am Listen-Ende.' },
    loading: { control: 'boolean', description: 'Zeigt „Laden…"-Platzhalter.' },
    placeholder: { control: 'text' },
  },
}
export default meta

// Default: root-minimaler Render — wenige Optionen, leere Auswahl, keine Extras.
export const Default = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.default" className="max-w-md">
      <TagMultiSelect options={OPTIONS.slice(0, 3)} value={[]} onChange={noop} />
    </div>
  ),
}

// Main: realistischer Hauptfall — volle Optionsmenge, einige Tags gewählt,
// Create erlaubt (wie ein Tag-Picker in einem Issue-Formular).
export const Main = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.main">
      <TagMultiSelectHarness
        initial={[1, 4]}
        allowCreate
        placeholder="Tag suchen oder anlegen…"
      />
    </div>
  ),
}

// State_Empty: keine Optionen verfügbar → leere Auswahlmenge (Empty-State).
export const State_Empty = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.empty">
      <TagMultiSelect options={[]} value={[]} onChange={noop} placeholder="Keine Tags vorhanden" />
    </div>
  ),
}

// State_Loading: loading-Prop → „Laden…"-Platzhalter in der offenen Liste.
export const State_Loading = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.loading">
      <TagMultiSelectHarness initial={[]} loading placeholder="Tags laden…" />
    </div>
  ),
}

// Variant_AllowCreate: allowCreate aktiv, eine Auswahl gesetzt — Create-Suggestion
// erscheint, sobald die Query keinen exakten Treffer hat.
export const Variant_AllowCreate = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.allow-create">
      <TagMultiSelectHarness initial={[2]} allowCreate placeholder="Tag suchen oder anlegen…" />
    </div>
  ),
}

// Interaction_Keyboard: ArrowDown/ArrowUp bewegen den Highlight, Enter committet
// den hervorgehobenen Tag (onChange mit neuem value), Backspace entfernt den
// letzten Chip, Escape schliesst + reicht den Fokus zurück (onEscape).
const changeSpy = fn()
const escapeSpy = fn()
export const Interaction_Keyboard = {
  render: () => (
    <div data-ui="molecule.tag-multi-select.keyboard">
      <TagMultiSelect
        options={OPTIONS}
        value={[1]}
        onChange={changeSpy}
        onEscape={escapeSpy}
        allowCreate
        placeholder="Tag suchen oder anlegen…"
      />
    </div>
  ),
  play: async ({ canvas }) => {
    changeSpy.mockClear()
    escapeSpy.mockClear()
    const input = canvas.getByRole('combobox')

    // Öffnen + Highlight bewegen. remaining = [2,3,4,5,6]; Highlight startet auf 0.
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}') // 0 → 1 (backend → design)
    await userEvent.keyboard('{ArrowUp}')   // 1 → 0 (zurück auf backend, value=2)
    // Enter committet den hervorgehobenen Eintrag → onChange([...[1], 2]).
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(changeSpy).toHaveBeenCalledWith([1, 2]))

    // Backspace bei leerer Query entfernt den letzten Chip (value=[1] → []).
    changeSpy.mockClear()
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(changeSpy).toHaveBeenCalledWith([]))

    // Escape schliesst + Fokus-Handoff an den Consumer.
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(escapeSpy).toHaveBeenCalled())
  },
}
