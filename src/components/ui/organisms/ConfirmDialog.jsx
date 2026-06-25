import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-287 — ConfirmDialog (Organism, 05.60 Overlay). Generisches Bestätigungs-
 * Overlay: Titel + Nachricht + Cancel/Confirm. `danger` rendert die Confirm-Aktion
 * als danger-Akzent (z.B. Löschen-Bestätigung, MOD-4). Komponiert ModalShell
 * (headerless) + DialogHeader/DialogFooter + Button-Atome.
 *
 * Dumb bzgl. Daten: `message` ist ein Slot/String, `onConfirm`/`onClose` die
 * Callbacks. Die eigentliche Mutation macht der Consumer (CONV-molecule-boundary).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {string} [props.title='Bestätigen']
 * @param {import('react').ReactNode} [props.message]
 * @param {string} [props.confirmLabel='Bestätigen']
 * @param {string} [props.cancelLabel='Abbrechen']
 * @param {boolean} [props.danger=false] - Confirm-Aktion als danger-Akzent.
 * @param {boolean} [props.busy=false] - Confirm zeigt Spinner + disabled.
 * @param {()=>void} [props.onConfirm]
 */
export default function ConfirmDialog({
  open,
  onClose,
  title = 'Bestätigen',
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  danger = false,
  busy = false,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.confirm-dialog">
      <DialogHeader title={title} onClose={onClose} data-ui="organism.confirm-dialog.header" />
      <div data-ui="organism.confirm-dialog.message" className="px-4 py-4 text-sm text-[var(--subtext1)]">
        {message}
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.confirm-dialog.cancel">{cancelLabel}</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          loading={busy}
          onClick={onConfirm}
          data-ui="organism.confirm-dialog.confirm"
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Modal>
  )
}
