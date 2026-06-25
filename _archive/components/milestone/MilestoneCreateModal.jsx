// DD-462: MilestoneCreateModal — neuer Create-Entry-Point für Milestones.
// Nutzt MilestoneForm (aus diesem Modul) via FormPage variant=modal.
//
// Props:
//   open      {boolean}   - Sichtbarkeit
//   onClose   {function}  - Schließen-Handler
//   onSaved   {function}  - wird nach erfolgreichem Create aufgerufen (optional)

import FormPage from '../ui/FormPage.jsx'
import { MilestoneForm } from './MilestoneForm.jsx'

export default function MilestoneCreateModal({ open, onClose, onSaved }) {
  if (!open) return null

  function handleSaved(milestone) {
    onSaved?.(milestone)
    onClose()
  }

  // MilestoneForm chrome='page' liefert den body direkt; FormPage variant='modal'
  // ummantelt ihn mit Backdrop + Panel + ESC-Close (zentrales ui/Modal).
  return (
    <FormPage
      variant="modal"
      open={open}
      onClose={onClose}
      size="md"
      data-ui="milestone-create-modal"
      sections={
        <MilestoneForm
          initial={null}
          onSaved={handleSaved}
          onCancel={onClose}
          chrome="page"
        />
      }
    />
  )
}
