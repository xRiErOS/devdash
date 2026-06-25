/**
 * GF-2 P01 — Toast (04.50 Status). Präsentationale Feedback-Molecule: EINE
 * Toast-Zeile (kind-Icon + Message + optionaler Dismiss). Token-sauber,
 * props-driven (kein Store/Fetch). Event-Listening/Auto-Dismiss/Stacking ist
 * HOST-Sache (ToastHost) → qa_behavioral:n/a.
 *
 * Naming (Gate gf-tier-story-names, 04+05): Pflicht `Default` (zuerst,
 * Root-Minimal) + `Main` (realistisch befüllt); frei `Variant_<X>`. data-ui je
 * Story-Wrapper (Distinctness-Gate A2). Default (info, kurz, ohne Dismiss) ≠
 * Main (success, realistisch, mit Dismiss) → A1.
 */
import Toast from '../../../components/ui/molecules/Toast.jsx'

const meta = {
  title: '04 MOLECULES/04.50 Status/Toast',
  component: Toast,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    message: { control: 'text', description: 'Anzuzeigender Text.' },
    kind: {
      control: 'inline-radio',
      options: ['success', 'error', 'info'],
      description: 'Variante → Icon-Rolle + Akzent (success/error/info).',
    },
    onDismiss: { control: false, description: 'Gesetzt → Dismiss-Button sichtbar (HOST-Callback).' },
  },
  args: {
    message: 'Hinweis',
    kind: 'info',
  },
}
export default meta

// Default: Root-Minimal — info-kind, kurze Message, kein Dismiss. args-getrieben
// (Controls-Panel steuert message/kind). autodocs-Primary.
export const Default = {
  render: (args) => (
    <div data-ui="molecule.toast.default" className="max-w-sm">
      <Toast {...args} />
    </div>
  ),
}

// Main: realistisch befüllter Hauptfall — success, echte Message, mit Dismiss.
export const Main = {
  render: () => (
    <div data-ui="molecule.toast.main" className="max-w-sm">
      <Toast kind="success" message="Issue DD-742 erfolgreich gespeichert." onDismiss={() => {}} />
    </div>
  ),
}

// Variant_Error: error-kind (danger-Icon + var(--red)-Akzent), mit Dismiss.
export const Variant_Error = {
  render: () => (
    <div data-ui="molecule.toast.variant_error" className="max-w-sm">
      <Toast kind="error" message="Speichern fehlgeschlagen — bitte erneut versuchen." onDismiss={() => {}} />
    </div>
  ),
}

// Variant_Info: info-kind (info-Icon + var(--surface1)-Akzent), mit Dismiss.
export const Variant_Info = {
  render: () => (
    <div data-ui="molecule.toast.variant_info" className="max-w-sm">
      <Toast kind="info" message="Sprint DD#12 ist jetzt aktiv." onDismiss={() => {}} />
    </div>
  ),
}
