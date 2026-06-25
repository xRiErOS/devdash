/**
 * GF-2 G2 — ColorSwatchPicker (04.10 Form). Präsentationaler Projekt-Akzentfarben-
 * Picker: eine ARIA-Radiogroup aus wählbaren Farb-Swatches. Controlled (Eltern halten
 * den State), token-sauber, props-driven (kein Store/Fetch). Jeder Swatch ist aus dem
 * Button-Atom komponiert (Canon R11 — kein rohes <button>); role/aria-checked werden
 * durch das Atom durchgereicht.
 *
 * Naming (Gate gf-tier-story-names, 04+05): Pflicht `Default` (zuerst, Root-Minimal,
 * nichts gewählt) + `Main` (realistisch befüllt, eine Farbe gewählt); frei
 * `Variant_<X>` · `State_<X>` · `Interaction_<X>`. data-ui je Story-Wrapper
 * (Distinctness-Gate A2). Default (nichts gewählt) ≠ Main (mauve gewählt) → A1.
 *
 * qa_behavioral:done — die Auswahl trägt echte Interaktionslogik (onChange), bewiesen
 * durch die Interaction_Select-play-Story.
 */
import { fn, userEvent, within, expect, waitFor } from 'storybook/test'
import ColorSwatchPicker, { DEFAULT_COLORS } from '../../../components/ui/molecules/ColorSwatchPicker.jsx'

const meta = {
  title: '04 MOLECULES/04.10 Form/ColorSwatchPicker',
  component: ColorSwatchPicker,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:done'],
  parameters: { layout: 'padded' },
  argTypes: {
    colors: { control: false, description: 'Wählbare Akzente ({ key, token }[]). Default = Catppuccin-Set.' },
    value: { control: 'text', description: 'Gewählter Key (controlled).' },
    onChange: { control: false, description: 'onChange(key) — vom Eltern-State gehalten.' },
    name: { control: 'text', description: 'Radiogroup-Name.' },
    ariaLabel: { control: 'text', description: 'aria-label der Gruppe.' },
    disabled: { control: 'boolean', description: 'Deaktiviert die ganze Gruppe.' },
  },
  args: {
    onChange: fn(),
  },
}
export default meta

// Default: Root-Minimal — Default-Farb-Set, nichts gewählt. args-getrieben
// (Controls-Panel steuert value/disabled). autodocs-Primary.
export const Default = {
  render: (args) => (
    <div data-ui="molecule.color-swatch-picker.default">
      <ColorSwatchPicker {...args} />
    </div>
  ),
}

// Main: realistisch befüllter Hauptfall — Default-Set mit einer gewählten Farbe (mauve).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.color-swatch-picker.main">
      <ColorSwatchPicker {...args} value="mauve" />
    </div>
  ),
}

// Variant_Compact: reduziertes Set (4 Farben) — liest für enge Picker (z.B. Inline).
export const Variant_Compact = {
  render: (args) => (
    <div data-ui="molecule.color-swatch-picker.variant_compact">
      <ColorSwatchPicker
        {...args}
        colors={DEFAULT_COLORS.slice(0, 4)}
        value="green"
      />
    </div>
  ),
}

// State_Disabled: ganze Gruppe deaktiviert (eine Vorauswahl bleibt sichtbar).
export const State_Disabled = {
  render: (args) => (
    <div data-ui="molecule.color-swatch-picker.state_disabled">
      <ColorSwatchPicker {...args} value="blue" disabled />
    </div>
  ),
}

// Interaction_Select: play — Klick auf einen Swatch feuert onChange mit dessen Key.
export const Interaction_Select = {
  render: (args) => (
    <div data-ui="molecule.color-swatch-picker.interaction_select">
      <ColorSwatchPicker {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const peach = canvas.getByRole('radio', { name: 'peach' })
    await userEvent.click(peach)
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith('peach'))
  },
}
