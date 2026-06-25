import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-290 — StatusChangeModal (Organism, 05.60 Overlay). Overlay zum Status-Wechsel
 * der selektierten Issues (BulkActionBar MOD-3; CAP-issue-status-transition).
 * Komponiert ModalShell (headerless) + DialogHeader/DialogFooter + Button-Atome.
 *
 * WICHTIG: nur ERLAUBTE Übergänge auswählbar — der Consumer liefert via
 * `allowedStatuses` ausschließlich valide Ziel-Stati (Lifecycle-Validierung bleibt
 * autoritativ beim Backend). Stateful (Ziel-Status-Entwurf bis Apply).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string}>} [props.allowedStatuses=[]] - nur valide Transitions.
 * @param {string} [props.value] - initial gewählter Ziel-Status.
 * @param {number} [props.selectedCount] - Anzahl betroffener Issues (Kontext im Header).
 * @param {(status:string)=>void} [props.onApply]
 */
export default function StatusChangeModal({
  open,
  onClose,
  allowedStatuses = [],
  value,
  selectedCount,
  onApply,
}) {
  const [selected, setSelected] = useState(value ?? null)

  const subtitle =
    typeof selectedCount === 'number' ? `${selectedCount} Issue(s) betroffen` : undefined

  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.status-change-modal">
      <DialogHeader
        title="Status ändern"
        subtitle={subtitle}
        onClose={onClose}
        data-ui="organism.status-change-modal.header"
      />
      <div className="flex flex-col gap-2 px-4 py-4">
        {allowedStatuses.map((s) => {
          const isSelected = selected === s.value
          // R2-MOD-3: jede Option = bordered surface0-Zeile → hebt sich vom Modal-
          // Hintergrund ab; selektiert = Akzent-Border/-Text + Check-Icon.
          const optionClass = `w-full justify-between border bg-[var(--surface0)] ${
            isSelected
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-[var(--surface2)]'
          }`
          return (
            <Button
              key={s.value}
              variant="ghost"
              size="md"
              onClick={() => setSelected(s.value)}
              data-ui={`organism.status-change-modal.option-${s.value}`}
              aria-pressed={isSelected}
              trailingIcon={isSelected ? <Check size={16} aria-hidden="true" /> : undefined}
              className={optionClass}
            >
              {s.label}
            </Button>
          )
        })}
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.status-change-modal.cancel">Abbrechen</Button>
        <Button
          variant="primary"
          disabled={!selected}
          onClick={() => selected && onApply?.(selected)}
          data-ui="organism.status-change-modal.apply"
        >
          Anwenden
        </Button>
      </DialogFooter>
    </Modal>
  )
}
