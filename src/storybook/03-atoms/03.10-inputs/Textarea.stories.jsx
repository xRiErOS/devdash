/**
 * Textarea — Atom (03.10 Inputs). Mehrzeiliges Pendant zu Input/Select,
 * token-saubere Freitext-Eingabe (Pattern P05/P19). Props-driven, kein Store.
 * Muster = Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Reife status:stable — frisch aus 90 Archive extrahiert (CONV-archive-extract-move).
 *
 * Achsen: nur Default + States + Composition zutreffend — Textarea hat weder
 * variant- noch color/tone- noch size-Prop (Variants/Appearance/Sizes entfallen).
 */
import Textarea from '../../../components/ui/atoms/Textarea.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Textarea',
  component: Textarea,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    rows: { control: { type: 'number' }, description: 'Sichtbare Zeilenzahl (Default 3).' },
    disabled: { control: 'boolean', description: 'Deaktiviert das Feld (opacity + not-allowed).' },
    placeholder: { control: 'text', description: 'Prompt-Text im leeren Feld.' },
    defaultValue: { control: 'text' },
  },
  args: {
    rows: 3,
    disabled: false,
    placeholder: 'Beschreibung eingeben …',
    defaultValue: '',
  },
}
export default meta

// Default: args-getrieben (autodocs <Primary>). Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.textarea.default" className="max-w-md">
      <Textarea {...args} />
    </div>
  ),
}

// States = Zustand-Booleans (disabled). Default-/Disabled-Feld 1:1 ansprechbar.
export const States = {
  render: () => (
    <div data-ui="atom.textarea.states" className="flex flex-col gap-2 max-w-md">
      <Textarea
        rows={3}
        defaultValue="Editierbares Feld — vertikal resizebar."
        data-ui="atom.textarea.state-default"
      />
      <Textarea
        rows={3}
        disabled
        defaultValue="Deaktiviertes Feld — nicht editierbar."
        data-ui="atom.textarea.state-disabled"
      />
    </div>
  ),
}

// Composition = Slot-/Größen-Anordnung: Placeholder-Prompt + höheres rows-Feld.
export const Composition = {
  render: () => (
    <div data-ui="atom.textarea.composition" className="flex flex-col gap-2 max-w-md">
      <Textarea rows={2} placeholder="Kurze Notiz …" data-ui="atom.textarea.placeholder" />
      <Textarea
        rows={6}
        defaultValue="Längerer Block — sechs Zeilen für ausführlichere Inhalte."
        data-ui="atom.textarea.rows-large"
      />
    </div>
  ),
}
