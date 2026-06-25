import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-292 — SelectAllModal (Organism, 05.60 Overlay, R3-LAB-1). Overlay, das der
 * Select-Mode-Toggle der `ListActionBar` öffnet: die „Alle auswählen"-Steuerung
 * lebt hier (statt inline in der Leiste) — konsistent zu den anderen Triggern, die
 * Overlays öffnen. Komponiert ModalShell (headerless) + DialogHeader/DialogFooter +
 * Checkbox-Atom (3-Zustände: leer · indeterminate · checked).
 *
 * Präsentational: `allSelected`/`someSelected` kommen als Props (die ListView
 * berechnet sie aus selectedIds vs items); die Mutation macht der Consumer via
 * `onToggleSelectAll` (Checkbox) bzw. `onConfirm` (OK).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {number} [props.selectedCount=0] - aktuell selektiert (Header-Kontext).
 * @param {number} [props.totalCount=0] - Gesamtzahl der Items (Label „Alle (N)").
 * @param {boolean} [props.allSelected=false] - Checkbox checked.
 * @param {boolean} [props.someSelected=false] - Checkbox indeterminate.
 * @param {(e:any)=>void} [props.onToggleSelectAll] - „Alle auswählen"/„Auswahl leeren".
 * @param {()=>void} [props.onConfirm] - OK (Auswahl übernehmen, Modal schließen).
 */
export default function SelectAllModal({
  open,
  onClose,
  selectedCount = 0,
  totalCount = 0,
  allSelected = false,
  someSelected = false,
  onToggleSelectAll,
  onConfirm,
}) {
  const subtitle = `${selectedCount}/${totalCount} ausgewählt`

  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.select-all-modal">
      <DialogHeader title="Auswahl" subtitle={subtitle} onClose={onClose} data-ui="organism.select-all-modal.header" />
      <div className="flex flex-col gap-2 px-4 py-4">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={onToggleSelectAll}
          label={`Alle auswählen (${totalCount})`}
          data-ui="organism.select-all-modal.select-all"
        />
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.select-all-modal.cancel">Abbrechen</Button>
        <Button variant="primary" onClick={onConfirm} data-ui="organism.select-all-modal.confirm">OK</Button>
      </DialogFooter>
    </Modal>
  )
}
