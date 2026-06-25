import { useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Select from '../molecules/Select.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-289 — MoveModal (Organism, 05.60 Overlay). Overlay zum Verschieben der
 * selektierten Issues in einen anderen Backlog/ein anderes Projekt (von der
 * BulkActionBar getriggert, MOD-2; CAP-issue-move). Komponiert ModalShell
 * (headerless) + DialogHeader/DialogFooter + molecule-Select (R2-MOD-2: Custom-
 * Dropdown mit Suche statt native `<select>`; Shared-Component mit AssignSprintModal).
 *
 * Stateful: hält das gewählte Ziel intern, bis der Consumer `onMove(targetId)`
 * erhält. Die eigentliche Verschiebung macht der Consumer (CONV-molecule-boundary).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string}>} [props.targets=[]] - Ziel-Backlogs/Projekte.
 * @param {string} [props.value] - initial gewähltes Ziel.
 * @param {number} [props.selectedCount] - Anzahl zu verschiebender Issues (Hinweis).
 * @param {(targetId:string)=>void} [props.onMove]
 */
export default function MoveModal({
  open,
  onClose,
  targets = [],
  value = '',
  selectedCount,
  onMove,
}) {
  const [target, setTarget] = useState(value)

  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.move-modal">
      <DialogHeader title="Verschieben" onClose={onClose} data-ui="organism.move-modal.header" />
      <div className="flex flex-col gap-3 px-4 py-4">
        {typeof selectedCount === 'number' && (
          <p className="text-sm text-[var(--subtext1)]">
            {selectedCount} {selectedCount === 1 ? 'Issue' : 'Issues'} verschieben nach:
          </p>
        )}
        <Select
          options={targets}
          placeholder="Ziel wählen…"
          value={target}
          onChange={(v) => setTarget(v)}
          searchable
          ariaLabel="Ziel"
          data-ui="organism.move-modal.target"
        />
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.move-modal.cancel">Abbrechen</Button>
        <Button
          variant="primary"
          disabled={!target}
          onClick={() => onMove?.(target)}
          data-ui="organism.move-modal.move"
        >
          Verschieben
        </Button>
      </DialogFooter>
    </Modal>
  )
}
