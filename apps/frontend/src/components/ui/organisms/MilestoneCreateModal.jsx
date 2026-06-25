/**
 * MilestoneCreateModal — kanonisches, token-sauberes Organism (DD-481 Phase-3
 * Batch-5 DEFER, harvested aus src/components/milestone/MilestoneCreateModal.jsx,
 * urspr. DD-462).
 *
 * Tier-Hebung (DEFER, Molecule → Organism): die Quelle galt als dünner
 * Modal-Wrapper, kennt aber die Milestone-Domäne (Create-Entry-Point) und
 * komponiert das domänen-bewusste MilestoneForm-Organism — damit ist sie ein
 * Organism, kein generisches Layout-Molecule.
 *
 * Domänen-bewusste Einheit: Create-Entry-Point für einen Milestone. Komponiert
 * das ./MilestoneForm.jsx-Organism (chrome='page' → reiner Body) und ummantelt
 * es mit dem ../molecules/Modal.jsx-Molecule (Backdrop + zentriertes Panel +
 * ESC-Close + Focus-Anker + role=dialog).
 *
 * TEMPLATE-ERSATZ (Phase-4-Hinweis): die Quelle nutzte das FormPage-Template
 * (`../ui/FormPage.jsx`, variant='modal') als dünnen Modal-Variant-Wrapper.
 * FormPage gehört in die Template-Tier (Phase 4) und ist hier noch nicht
 * verfügbar — deshalb wird der Backdrop/Panel/ESC-Rahmen direkt über das
 * Modal-Molecule erzeugt (funktional äquivalent zu FormPage variant='modal').
 * Bei Phase-5-Migration kann der Modal-Wrap durch FormPage zurückgetauscht
 * werden, ohne dass sich die Props-API dieses Organisms ändert.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle reichte `onSaved` an MilestoneForm durch, das den POST selbst
 *    ausführte und das persistierte Objekt zurückmeldete. Da das MilestoneForm-
 *    Organism inzwischen presentational ist (onSubmit liefert nur die Werte),
 *    ist die Persistenz hier zur Callback-Prop `onCreate(values)` gehoben — der
 *    Konsument führt den POST `/api/milestones` aus. `onClose` schliesst das
 *    Modal (unverändert).
 *  - In-Flight-/Fehler-Zustand kommen als `saving`/`error`-Props herein und
 *    werden an MilestoneForm durchgereicht (Trigger disabled / Fehlertext).
 *
 * Ephemerer UI-State: keiner auf dieser Ebene — der Draft-State lebt im
 * komponierten MilestoneForm-Organism.
 *
 * @param {object} props
 * @param {boolean} props.open - Sichtbarkeit
 * @param {(values:{name:string,description:string|null,target_date:string|null,deferred:boolean,isEdit:boolean,id?:number})=>void} [props.onCreate] - Create bestätigen (gehoben; Konsument führt POST aus)
 * @param {()=>void} [props.onClose] - Modal schliessen (X / ESC / Backdrop / Abbrechen)
 * @param {boolean} [props.saving=false] - Mutation in-flight → Trigger disabled (gehoben)
 * @param {string} [props.error=''] - extern gemeldeter Fehler-Text (gehoben)
 * @param {string} [props.dataUiScope='milestone-create-modal'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import Modal from '../molecules/Modal.jsx'
import MilestoneForm from './MilestoneForm.jsx'

export default function MilestoneCreateModal({
  open,
  onCreate,
  onClose,
  saving = false,
  error = '',
  dataUiScope = 'milestone-create-modal',
}) {
  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      headerless
      padded={false}
      autoFocus={false}
      manageEscape={false}
      dialogDataUi={dataUiScope}
      backdropDataUi={`${dataUiScope}.backdrop`}
    >
      <div data-ui={`${dataUiScope}.body`}>
        <MilestoneForm
          milestone={null}
          onSubmit={onCreate}
          onCancel={onClose}
          chrome="page"
          saving={saving}
          error={error}
          dataUiScope={`${dataUiScope}.form`}
        />
      </div>
    </Modal>
  )
}
