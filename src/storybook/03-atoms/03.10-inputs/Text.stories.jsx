/**
 * GF-2 — Text-Atom (Migration aus components/ui/atoms/Input.jsx).
 * Die Komponente bleibt `Input` (kanonisches Text-Eingabe-Primitive); die
 * Story heißt „Text", weil sie die freie Texteingabe-Achse zeigt.
 *
 * Folgt dem Referenz-Muster (Button.stories.jsx):
 *  - title = Pfad-Tier-Wahrheit (D12), tags: status-Reife (D09).
 *  - Kanonisches Achsen-Vokabular, feste Reihenfolge, nur zutreffende Achsen.
 *    Text: Default · Variants (type-Achse) · States · Composition.
 *  - data-ui an jedem Story-Wrapper UND jedem Varianten-Element (PO-1:1-Anker).
 *  - 0 inline-style, 0 Roh-Hex. Layout via Tailwind-Utilities.
 */
import Input from '../../../components/ui/atoms/Input.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Text',
  component: Input,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    placeholder: { control: 'text', description: 'Platzhalter-Text.' },
    value: { control: 'text', description: 'Kontrollierter Wert.' },
    type: { control: 'text', description: 'HTML-input-Typ (text, date, number, email, password).' },
    disabled: { control: 'boolean', description: 'Sperrt das Feld (opacity + not-allowed).' },
    leadingIcon: { control: false, description: 'Slot links eingebettet (z.B. Such-Icon).' },
    className: { control: false, description: 'Zusätzliche Klassen am <input>.' },
  },
  args: {
    placeholder: 'Suchen…',
    disabled: false,
  },
}
export default meta

// Default: args-getrieben — Controls-Panel steuert alle Props (autodocs <Primary>).
export const Default = {
  render: (args) => (
    <div data-ui="atom.text.default">
      <Input {...args} />
    </div>
  ),
}

// Variants = type-Achse: derselbe Primitive, native HTML-input-Typen.
// Password-Show/Hide-Toggle ist bewusst NICHT hier — das wäre ein eigenes
// Organism (Slot-Komposition mit IconButton), nicht das Text-Atom.
export const Variants = {
  render: () => (
    <div data-ui="atom.text.variants" className="flex flex-col gap-2">
      <Input data-ui="atom.text.type-text" type="text" placeholder="Text" />
      <Input data-ui="atom.text.type-date" type="date" />
      <Input data-ui="atom.text.type-number" type="number" placeholder="0" />
      <Input data-ui="atom.text.type-email" type="email" placeholder="name@example.com" />
      <Input data-ui="atom.text.type-password" type="password" placeholder="••••••••" />
    </div>
  ),
}

// States = Zustand-Booleans (disabled) — kanonische Zustand-Achse.
export const States = {
  render: () => (
    <div data-ui="atom.text.states" className="flex flex-col gap-2">
      <Input data-ui="atom.text.state-default" placeholder="Standard" />
      <Input data-ui="atom.text.state-filled" defaultValue="Befüllt" />
      <Input data-ui="atom.text.state-disabled" placeholder="Gesperrt" disabled />
    </div>
  ),
}

// Composition = Slot-Anordnung (leadingIcon).
export const Composition = {
  render: () => (
    <div data-ui="atom.text.composition" className="flex flex-col gap-2">
      <Input
        data-ui="atom.text.icon-left"
        placeholder="Suchen…"
        leadingIcon={<Icon name="search" size={14} />}
      />
    </div>
  ),
}
