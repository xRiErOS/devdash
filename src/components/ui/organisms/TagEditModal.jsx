import { useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import TagChip from '../molecules/TagChip.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-291 — TagEditModal (Organism, 05.60 Overlay). Overlay zum Tag-Hinzufügen/
 * -Entfernen für die selektierten Issues (BulkActionBar MOD-5 / BAB-4).
 * Komponiert ModalShell (headerless) + DialogHeader/DialogFooter + TagChip
 * (zugewiesene Tags, entfernbar) + Button (verfügbare Tags, hinzufügbar).
 *
 * Ebene-6: CAP-issue-tag-set 🟢 (Issue-Tags vollständig neu setzen). Stateful:
 * hält die gewählte Tag-Menge intern bis Apply; die Mutation macht der Consumer.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string,color?:string}>} [props.tagOptions=[]]
 * @param {string[]} [props.value=[]] - initial zugewiesene Tag-Values.
 * @param {(tags:string[])=>void} [props.onApply]
 * @param {number} [props.selectedCount] - Anzahl betroffener Issues (Header-Subtitle).
 */
export default function TagEditModal({
  open,
  onClose,
  tagOptions = [],
  value = [],
  onApply,
  selectedCount,
}) {
  const [chosen, setChosen] = useState(new Set(value))

  const toggle = (v) =>
    setChosen((s) => {
      const next = new Set(s)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })

  const selected = tagOptions.filter((t) => chosen.has(t.value))
  const available = tagOptions.filter((t) => !chosen.has(t.value))

  return (
    <Modal open={open} onClose={onClose} headerless size="md" padded={false} dialogDataUi="organism.tag-edit-modal">
      <DialogHeader
        title="Tags ändern"
        subtitle={typeof selectedCount === 'number' ? `${selectedCount} Issues` : undefined}
        onClose={onClose}
        data-ui="organism.tag-edit-modal.header"
      />
      <div className="flex flex-col gap-5 px-4 py-4">
        <section data-ui="organism.tag-edit-modal.assigned" className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--subtext0)]">Zugewiesen</h3>
          <div className="flex flex-wrap gap-2">
            {selected.length ? (
              selected.map((t) => (
                <TagChip
                  key={t.value}
                  color="primary"
                  onRemove={() => toggle(t.value)}
                  data-ui={`organism.tag-edit-modal.tag-${t.value}`}
                >
                  {t.label}
                </TagChip>
              ))
            ) : (
              <p className="text-xs text-[var(--subtext0)]">Keine Tags zugewiesen.</p>
            )}
          </div>
        </section>
        <section data-ui="organism.tag-edit-modal.available" className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--subtext0)]">Hinzufügen</h3>
          <div className="flex flex-wrap gap-2">
            {available.map((t) => (
              <Button
                key={t.value}
                variant="secondary"
                size="sm"
                onClick={() => toggle(t.value)}
                data-ui={`organism.tag-edit-modal.tag-${t.value}`}
              >
                + {t.label}
              </Button>
            ))}
          </div>
        </section>
      </div>
      <DialogFooter align="end">
        <Button variant="ghost" onClick={onClose} data-ui="organism.tag-edit-modal.cancel">Abbrechen</Button>
        <Button variant="primary" onClick={() => onApply?.([...chosen])} data-ui="organism.tag-edit-modal.apply">Anwenden</Button>
      </DialogFooter>
    </Modal>
  )
}
