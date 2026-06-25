import { useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import DialogHeader from '../molecules/DialogHeader.jsx'
import DialogFooter from '../molecules/DialogFooter.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import TagChip from '../molecules/TagChip.jsx'
import Button from '../atoms/Button.jsx'
import Select from '../atoms/Select.jsx'

/**
 * GF-248 — FilterDialog (Organism, 05.60 Overlay, OR-09). Erster **stateful**
 * Organism: hält den Filter-Entwurf intern, bis der Consumer Apply auslöst.
 * Komponiert ModalShell (headerless) + DialogHeader/DialogFooter + Form-Atome
 * (Checkbox je Achse, TagChip für die Tag-Mehrfachauswahl).
 *
 * Ebene-6 (OR-09): CAP-issue-list 🟢 + CAP-tag-filter 🟢 — beide present, daher
 * mit echten Filter-Achsen (Status · Type · Priority · Tag) baubar.
 *
 * Dumb bzgl. Daten (Optionen kommen als Props); der angewandte Filter geht via
 * `onApply(filter)` an die ListActionBar (active/count). `onReset` leert den Entwurf.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {()=>void} [props.onClose]
 * @param {Array<{value:string,label:string}>} [props.statusOptions=[]]
 * @param {Array<{value:string,label:string}>} [props.typeOptions=[]]
 * @param {Array<{value:string,label:string}>} [props.priorityOptions=[]]
 * @param {Array<{value:string,label:string,color?:string}>} [props.tagOptions=[]]
 * @param {{status:string[],type:string[],priority:string[],tags:string[]}} [props.value] - initialer Entwurf.
 * @param {(filter:{status:string[],type:string[],priority:string[],tags:string[]})=>void} [props.onApply]
 * @param {()=>void} [props.onReset]
 */
const EMPTY = { status: [], type: [], priority: [], tags: [], dateRange: '' }

export default function FilterDialog({
  open,
  onClose,
  statusOptions = [],
  typeOptions = [],
  priorityOptions = [],
  tagOptions = [],
  dateRangeOptions = [],
  value,
  onApply,
  onReset,
}) {
  const [draft, setDraft] = useState(value ? { ...EMPTY, ...value } : EMPTY)

  const toggle = (axis, val) => {
    setDraft((d) => {
      const set = new Set(d[axis])
      set.has(val) ? set.delete(val) : set.add(val)
      return { ...d, [axis]: [...set] }
    })
  }

  const reset = () => {
    setDraft(EMPTY)
    onReset?.()
  }

  const renderAxis = (axis, title, options) => (
    <fieldset data-ui={`organism.filter-dialog.axis-${axis}`} className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-medium text-[var(--subtext0)]">{title}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <Checkbox
            key={o.value}
            checked={draft[axis].includes(o.value)}
            onChange={() => toggle(axis, o.value)}
            label={o.label}
            data-ui={`organism.filter-dialog.${axis}-${o.value}`}
          />
        ))}
      </div>
    </fieldset>
  )

  return (
    <Modal open={open} onClose={onClose} headerless size="md" padded={false} dialogDataUi="organism.filter-dialog">
      <DialogHeader title="Filtern" onClose={onClose} data-ui="organism.filter-dialog.header" />
      <div className="flex flex-col gap-5 px-4 py-4">
        {renderAxis('status', 'Status', statusOptions)}
        {renderAxis('type', 'Typ', typeOptions)}
        {renderAxis('priority', 'Priorität', priorityOptions)}
        {dateRangeOptions.length > 0 ? (
          <fieldset data-ui="organism.filter-dialog.axis-date-range" className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-[var(--subtext0)]">Zeitraum</legend>
            <Select
              options={dateRangeOptions}
              value={draft.dateRange}
              onChange={(e) => setDraft((d) => ({ ...d, dateRange: e.target.value }))}
              placeholder="Zeitraum wählen…"
              data-ui="organism.filter-dialog.date-range"
            />
          </fieldset>
        ) : null}
        <fieldset data-ui="organism.filter-dialog.axis-tag" className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-[var(--subtext0)]">Tag</legend>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((t) => {
              const selected = draft.tags.includes(t.value)
              return (
                <TagChip
                  key={t.value}
                  color={selected ? 'primary' : 'neutral'}
                  onRemove={selected ? () => toggle('tags', t.value) : undefined}
                  data-ui={`organism.filter-dialog.tag-${t.value}`}
                >
                  {t.label}
                </TagChip>
              )
            })}
          </div>
        </fieldset>
      </div>
      <DialogFooter align="between">
        <Button variant="ghost" onClick={reset} data-ui="organism.filter-dialog.reset">Zurücksetzen</Button>
        <Button variant="primary" onClick={() => onApply?.(draft)} data-ui="organism.filter-dialog.apply">Anwenden</Button>
      </DialogFooter>
    </Modal>
  )
}
