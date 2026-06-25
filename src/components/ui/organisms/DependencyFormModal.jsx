import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'
import DependencyForm from './DependencyForm.jsx'

/**
 * DependencyFormModal — Organism (05.60 Overlay, OR-20, GF-301). Overlay-Variante der
 * DependencyForm: komponiert die kanonische Modal-Chrome (Modal + DialogHeader +
 * DialogFooter, wie AssignSprintModal & Co.) und bettet die geteilte, präsentationale
 * `DependencyForm` (DD-481) als Body ein — statt der früheren Bespoke-`onClose`-Chrome
 * (D04, ersetzt Header-X/Footer-„Fertig" der Form durch den Dialog-Standard).
 *
 * Präsentational: reicht alle Daten/Callbacks an die eingebettete Form durch; die
 * Mutationen (`onAdd`/`onRemove`) führt der Consumer aus. `onClose` schließt nur.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {{id:number}} props.entity
 * @param {'milestone'|'sprint'|'issue'} [props.variant='milestone']
 * @param {Array<{id:number,name:string}>} [props.candidates]
 * @param {{predecessors?:Array,successors?:Array}} [props.deps]
 * @param {(predecessorId:number,successorId:number)=>void} [props.onAdd]
 * @param {(dependencyId:number)=>void} [props.onRemove]
 * @param {{kind?:string,msg:string}|null} [props.error]
 * @param {string} [props.title='Abhängigkeiten bearbeiten']
 */
export default function DependencyFormModal({
  open,
  onClose,
  entity,
  variant = 'milestone',
  candidates = [],
  deps = {},
  onAdd,
  onRemove,
  error = null,
  title = 'Abhängigkeiten bearbeiten',
}) {
  return (
    <Modal open={open} onClose={onClose} headerless size="md" padded={false} dialogDataUi="organism.dependency-form-modal">
      <DialogHeader title={title} onClose={onClose} data-ui="organism.dependency-form-modal.header" />
      <div className="px-4 py-4">
        <DependencyForm
          entity={entity}
          variant={variant}
          candidates={candidates}
          deps={deps}
          onAdd={onAdd}
          onRemove={onRemove}
          error={error}
          dataUiScope="dependency-form"
        />
      </div>
      <DialogFooter align="end">
        <Button variant="primary" onClick={onClose} data-ui="organism.dependency-form-modal.done">Fertig</Button>
      </DialogFooter>
    </Modal>
  )
}
