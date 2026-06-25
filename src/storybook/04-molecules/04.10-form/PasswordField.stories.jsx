/**
 * GF-208-Muster — PasswordField (04.10 Form, GF-230). Molecule: komponiert das
 * Input-Atom + IconButton-Atom (Show/Hide-Toggle). Dumb (CONV-molecule-boundary):
 * präsentational, einziger Eigen-State = visuelle Sichtbarkeit. data-ui je Story
 * + je Element (PO-Ansprechbarkeit, T01).
 * GF-351: Composition-Achse ergänzt (Show/Hide-Slot-Kontext).
 */
import PasswordField from '../../../components/ui/molecules/PasswordField.jsx'

const meta = {
  title: '04 MOLECULES/04.10 Form/PasswordField',
  component: PasswordField,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    defaultVisible: { control: 'boolean', description: 'Start-Sichtbarkeit (maskiert vs. Klartext).' },
    value: { control: 'text', description: 'Controlled Wert (an Input durchgereicht).' },
  },
  args: {
    placeholder: 'Passwort',
    disabled: false,
    defaultVisible: false,
  },
}
export default meta

// Default: minimaler Zustand — Default-Props, keine Demo-Daten.
export const Default = {
  render: () => (
    <div data-ui="molecule.password-field.default" className="max-w-xs">
      <PasswordField />
    </div>
  ),
}

// Main = realistischer Hauptfall: befülltes Passwort-Feld im Login-Kontext.
export const Main = {
  render: () => (
    <div data-ui="molecule.password-field.main" className="max-w-xs">
      <PasswordField placeholder="Passwort" defaultValue="geheim123" />
    </div>
  ),
}

// States = maskiert (hidden) · sichtbar (shown) · gesperrt (disabled). Jede
// Achse mit eigenem data-ui zur 1:1-Ansprache.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.password-field.states" className="flex flex-col gap-3 max-w-xs">
      <div data-ui="molecule.password-field.hidden">
        <PasswordField defaultValue="geheim123" />
      </div>
      <div data-ui="molecule.password-field.shown">
        <PasswordField defaultValue="geheim123" defaultVisible />
      </div>
      <div data-ui="molecule.password-field.disabled">
        <PasswordField defaultValue="geheim123" disabled />
      </div>
    </div>
  ),
}

// Composition: Show/Hide-Slot-Kontext — PasswordField als Teil eines
// Login-Formulars (Label + Feld + Show/Hide-Toggle in Kontext).
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.password-field.composition" className="flex flex-col gap-4 max-w-xs">
      <div data-ui="molecule.password-field.composition-login-form" className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--text)]">Passwort</label>
        <div data-ui="molecule.password-field.composition-input">
          <PasswordField placeholder="Passwort eingeben" />
        </div>
      </div>
      <div data-ui="molecule.password-field.composition-confirm-form" className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--text)]">Passwort bestätigen</label>
        <div data-ui="molecule.password-field.composition-confirm-input">
          <PasswordField placeholder="Passwort wiederholen" defaultVisible />
        </div>
      </div>
    </div>
  ),
}
