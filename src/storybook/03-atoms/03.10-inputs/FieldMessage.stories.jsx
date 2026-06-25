/**
 * FieldMessage — Atom-Story (GF-208-Muster). Begleittext unter einem Eingabefeld.
 * Achsen: Default (args-Baseline) · Appearance (tone error/warning/info/hint).
 * 0 inline-style, 0 Roh-Hex. data-ui an Wrapper + jedem Varianten-Element.
 */
import FieldMessage from '../../../components/ui/atoms/FieldMessage.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/FieldMessage',
  component: FieldMessage,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['error', 'warning', 'info', 'hint'],
      description:
        'error → --accent-danger + role="alert"; warning → --accent-warning; info → --accent-info; hint → --subtext0 (neutral).',
    },
    id: { control: 'text', description: 'Ziel für aria-describedby am zugehörigen Feld.' },
    children: { control: 'text' },
  },
  args: {
    children: 'E-Mail ist ein Pflichtfeld.',
    tone: 'error',
  },
}
export default meta

// Default: args-getrieben — Controls-Panel steuert alle Props (autodocs <Primary>).
export const Default = {
  render: (args) => (
    <div data-ui="atom.field-message.default">
      <FieldMessage {...args} />
    </div>
  ),
}

// Appearance = Farb-/Tone-Achse (error/warning/info/hint). Jedes Element 1:1 ankerbar.
export const Appearance = {
  render: () => (
    <div data-ui="atom.field-message.appearance" className="flex flex-col gap-2">
      <FieldMessage data-ui="atom.field-message.error" tone="error">
        E-Mail ist ein Pflichtfeld.
      </FieldMessage>
      <FieldMessage data-ui="atom.field-message.warning" tone="warning">
        Dieses Passwort ist schwach — mindestens 12 Zeichen empfohlen.
      </FieldMessage>
      <FieldMessage data-ui="atom.field-message.info" tone="info">
        Die Änderung wird sofort wirksam.
      </FieldMessage>
      <FieldMessage data-ui="atom.field-message.hint" tone="hint">
        Wir verwenden deine E-Mail nur für Benachrichtigungen.
      </FieldMessage>
    </div>
  ),
}
