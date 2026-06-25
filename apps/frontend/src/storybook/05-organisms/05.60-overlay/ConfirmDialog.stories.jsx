/**
 * GF-287 — ConfirmDialog (05.60 Overlay). Generisches Bestätigungs-Overlay
 * (Titel + Nachricht + Cancel/Confirm). `danger` für destruktive Bestätigungen
 * (Löschen, MOD-4). Wiederverwendet von BulkActionBar (Löschen-Bestätigung).
 *
 * Präsentational (Mock-Props); die Mutation macht der Consumer. data-ui je Element.
 */
import ConfirmDialog from '../../../components/ui/organisms/ConfirmDialog.jsx'

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    danger: { control: 'boolean' },
    busy: { control: 'boolean' },
    open: { control: 'boolean' },
  },
  args: {
    open: true,
    title: 'Aktion bestätigen',
    message: 'Möchtest du fortfahren?',
    confirmLabel: 'Bestätigen',
    cancelLabel: 'Abbrechen',
    danger: false,
    busy: false,
  },
}
export default meta

// Default: minimaler Zustand (nur strukturell nötiges open, sonst Default-Props).
export const Default = {
  args: { open: true },
  render: () => (
    <div data-ui="organism.confirm-dialog.default">
      <ConfirmDialog open onClose={noop} onConfirm={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.confirm-dialog.main">
      <ConfirmDialog {...args} onClose={noop} onConfirm={noop} />
    </div>
  ),
}

// States: neutrale Bestätigung vs. destruktive (danger) Löschen-Bestätigung.
export const Variant_States = {
  render: () => (
    <div data-ui="organism.confirm-dialog.states" className="flex flex-col gap-4">
      <div data-ui="organism.confirm-dialog.state-neutral">
        <ConfirmDialog
          open
          title="Änderungen anwenden"
          message="Die ausgewählten Filter werden gespeichert."
          confirmLabel="Anwenden"
          onClose={noop}
          onConfirm={noop}
        />
      </div>
      <div data-ui="organism.confirm-dialog.state-danger">
        <ConfirmDialog
          open
          danger
          title="3 Issues löschen?"
          message="Diese Aktion entfernt die ausgewählten Issues dauerhaft. Sie kann nicht rückgängig gemacht werden."
          confirmLabel="Endgültig löschen"
          onClose={noop}
          onConfirm={noop}
        />
      </div>
    </div>
  ),
}
