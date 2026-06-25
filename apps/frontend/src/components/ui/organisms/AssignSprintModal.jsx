import { useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Select from '../molecules/Select.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-288 — AssignSprintModal (Organism, 05.60 Overlay, MOD-1). Overlay zum Zuweisen
 * eines Sprints zu den selektierten Issues — von der BulkActionBar getriggert.
 * Komponiert ModalShell (headerless) + DialogHeader/DialogFooter + molecule-Select
 * (R2-MOD-1: Custom-Dropdown mit Suche statt native `<select>`).
 *
 * stateful: hält den gewählten `sprintId` intern bis Apply. Dumb bzgl. Daten
 * (`sprints` kommen als Props); die Mutation macht der Consumer via `onAssign`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string}>} [props.sprints=[]]
 * @param {string} [props.value=''] - vorbelegter Sprint.
 * @param {number} [props.selectedCount] - Anzahl betroffener Issues (Titel-Kontext).
 * @param {(sprintId:string)=>void} [props.onAssign]
 */
export default function AssignSprintModal({
  open,
  onClose,
  sprints = [],
  value = '',
  selectedCount,
  onAssign,
}) {
  const [sprintId, setSprintId] = useState(value)
  const title = selectedCount ? `${selectedCount} Issues — Sprint zuweisen` : 'Sprint zuweisen'

  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.assign-sprint-modal">
      <DialogHeader title={title} onClose={onClose} data-ui="organism.assign-sprint-modal.header" />
      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-xs font-medium text-[var(--subtext0)]">Ziel-Sprint</span>
        <Select
          options={sprints}
          placeholder="Sprint wählen…"
          value={sprintId}
          onChange={(v) => setSprintId(v)}
          searchable
          ariaLabel="Ziel-Sprint"
          data-ui="organism.assign-sprint-modal.select"
        />
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.assign-sprint-modal.cancel">Abbrechen</Button>
        <Button
          variant="primary"
          disabled={!sprintId}
          onClick={() => onAssign?.(sprintId)}
          data-ui="organism.assign-sprint-modal.assign"
        >
          Zuweisen
        </Button>
      </DialogFooter>
    </Modal>
  )
}
