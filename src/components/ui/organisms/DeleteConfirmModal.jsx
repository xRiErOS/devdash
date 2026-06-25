import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'

/**
 * DeleteConfirmModal — Organism (05.60 Overlay). Generisches Bestätigungs-Overlay
 * für eine destruktive Lösch-Aktion. Komponiert ModalShell (headerless) +
 * DialogHeader/DialogFooter; der Fuß trägt einen `danger`-Bestätigen- und einen
 * `ghost`-Abbrechen-Button (Muster wie MoveModal).
 *
 * Dumb/controlled (CONV-molecule-boundary): kein State, kein API-Call. Der
 * Consumer hält `open` und führt die eigentliche Löschung in `onConfirm` aus
 * (reicht `busy` zurück, solange der Request läuft → Button loading + disabled).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose] - ESC/Backdrop/Abbrechen.
 * @param {() => void} [props.onConfirm] - Klick auf den danger-Button.
 * @param {import('react').ReactNode} [props.title='Wirklich löschen?']
 * @param {import('react').ReactNode} [props.message] - Erklärtext (was/irreversibel).
 * @param {string} [props.deleteLabel='Löschen']
 * @param {string} [props.cancelLabel='Abbrechen']
 * @param {boolean} [props.busy=false] - Löschung in-flight → danger-Button loading/disabled.
 * @param {string} [props.dataUiScope='delete-confirm-modal']
 */
export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Wirklich löschen?',
  message,
  deleteLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  busy = false,
  dataUiScope = 'delete-confirm-modal',
}) {
  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} busy={busy} dialogDataUi={dataUiScope}>
      <DialogHeader title={title} onClose={onClose} data-ui={`${dataUiScope}.header`} />
      {message != null && (
        <div data-ui={`${dataUiScope}.message`} className="px-4 py-4 text-sm text-[var(--subtext1)]">
          {message}
        </div>
      )}
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui={`${dataUiScope}.cancel`}>
          {cancelLabel}
        </Button>
        <Button variant="danger" loading={busy} onClick={onConfirm} data-ui={`${dataUiScope}.confirm`}>
          {deleteLabel}
        </Button>
      </DialogFooter>
    </Modal>
  )
}
