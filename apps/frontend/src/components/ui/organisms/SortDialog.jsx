import { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Button from '../atoms/Button.jsx'

/**
 * GF-249 — SortDialog (Organism, 05.60 Overlay, OR-10). Schwester des FilterDialog,
 * kleinerer Scope: Sort-Feld + Richtung (asc/desc). Stateful — hält den Sort-Entwurf
 * intern, bis der Consumer Apply auslöst.
 *
 * Ebene-6 (OR-10): CAP-issue-list 🟢 present (sortieren). Sort-Achsen aus den
 * list-fähigen Feldern (created/updated/priority/title/status).
 *
 * Komponiert ModalShell (headerless) + DialogHeader/DialogFooter + Button-Atome
 * (Feld-Auswahl + asc/desc-Toggle). SegmentBar ist ein Display-Balken (kein
 * Segmented-Control) → der Richtungs-Toggle nutzt zwei Buttons (aktiv = primary).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string}>} [props.fields=[]]
 * @param {string} [props.sortBy] - initial gewähltes Feld.
 * @param {'asc'|'desc'} [props.direction='asc']
 * @param {(sort:{sortBy:string,direction:'asc'|'desc'})=>void} [props.onApply]
 * @param {()=>void} [props.onReset]
 */
export default function SortDialog({
  open,
  onClose,
  fields = [],
  sortBy,
  direction = 'asc',
  onApply,
  onReset,
}) {
  const [draft, setDraft] = useState({ sortBy: sortBy ?? fields[0]?.value, direction })

  const reset = () => {
    setDraft({ sortBy: fields[0]?.value, direction: 'asc' })
    onReset?.()
  }

  return (
    <Modal open={open} onClose={onClose} headerless size="sm" padded={false} dialogDataUi="organism.sort-dialog">
      <DialogHeader title="Sortieren" onClose={onClose} data-ui="organism.sort-dialog.header" />
      <div className="flex flex-col gap-5 px-4 py-4">
        <fieldset data-ui="organism.sort-dialog.fields" className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-[var(--subtext0)]">Feld</legend>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <Button
                key={f.value}
                data-ui={`organism.sort-dialog.field-${f.value}`}
                variant={draft.sortBy === f.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, sortBy: f.value }))}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-[var(--subtext0)]">Richtung</legend>
          <div className="flex gap-2">
            <Button
              data-ui="organism.sort-dialog.dir-asc"
              variant={draft.direction === 'asc' ? 'primary' : 'secondary'}
              size="sm"
              leadingIcon={<ArrowUp size={14} aria-hidden="true" />}
              onClick={() => setDraft((d) => ({ ...d, direction: 'asc' }))}
            >
              Aufsteigend
            </Button>
            <Button
              data-ui="organism.sort-dialog.dir-desc"
              variant={draft.direction === 'desc' ? 'primary' : 'secondary'}
              size="sm"
              leadingIcon={<ArrowDown size={14} aria-hidden="true" />}
              onClick={() => setDraft((d) => ({ ...d, direction: 'desc' }))}
            >
              Absteigend
            </Button>
          </div>
        </fieldset>
      </div>
      <DialogFooter align="between">
        <Button variant="ghost" onClick={reset} data-ui="organism.sort-dialog.reset">Zurücksetzen</Button>
        <Button variant="primary" onClick={() => onApply?.(draft)} data-ui="organism.sort-dialog.apply">Anwenden</Button>
      </DialogFooter>
    </Modal>
  )
}
