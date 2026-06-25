/**
 * MilestoneModal — Organism (DD-481). Generisches Milestone-Formular-Overlay mit
 * zwei Varianten über `mode`: `create` (neuer Milestone) und `edit` (bestehenden
 * bearbeiten). Komponiert das Modal-Molecule + Input/Textarea/Button-Atoms + das
 * Select-Molecule. Ersetzt das frühere zweck-spezifische `milestone-edit-form`
 * durch EIN wiederverwendbares `milestone-modal`.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Initialwerte kommen als Prop
 * `milestone`; gespeichert wird über `onSave(values)`. EINZIGER eigener State ist
 * der ephemere Editier-Draft — bei jedem Öffnen aus `milestone` (bzw. leer im
 * create-Modus) neu geseedet (Form-Save-UX: Snapshot vor Save).
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex.
 *
 * @param {object} props
 * @param {boolean} props.open - sichtbar
 * @param {'create'|'edit'} [props.mode='edit'] - Variante (Titel/Save-Label/Key-Anzeige)
 * @param {{key?:string,name?:string,status?:string,target?:string,description?:string}} [props.milestone={}]
 *        - Initialwerte (im edit-Modus); im create-Modus ignoriert (leere Felder)
 * @param {Array<{value:string,label:string}>} [props.statusOptions] - Status-Auswahl
 * @param {(values:{name:string,status:string,target:string,description:string})=>void} props.onSave
 * @param {()=>void} props.onClose
 * @param {string} [props.dataUiScope='milestone-modal'] - Wurzel-data-ui-bereich (I03/D01)
 */
import { useEffect, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'
import Select from '../molecules/Select.jsx'

const DEFAULT_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planung' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'done', label: 'Fertig' },
  { value: 'blocked', label: 'Blockiert' },
]

const EMPTY = { name: '', status: 'planning', target: '', description: '' }

export default function MilestoneModal({
  open,
  mode = 'edit',
  milestone = {},
  statusOptions = DEFAULT_STATUS_OPTIONS,
  onSave,
  onClose,
  dataUiScope = 'milestone-modal',
}) {
  const isCreate = mode === 'create'
  const [draft, setDraft] = useState(EMPTY)

  // Draft beim Öffnen neu seeden: create → leer, edit → aus milestone.
  useEffect(() => {
    if (!open) return
    setDraft(
      isCreate
        ? EMPTY
        : {
            name: milestone.name ?? '',
            status: milestone.status ?? 'planning',
            target: milestone.target ?? '',
            description: milestone.description ?? '',
          },
    )
  }, [open, isCreate, milestone])

  const patch = (key) => (val) => setDraft((d) => ({ ...d, [key]: val }))

  const handleSave = () => {
    onSave?.({ ...draft, name: draft.name.trim() })
    onClose?.()
  }

  const fid = (name) => `${dataUiScope}-${name}`
  const labelCls = 'block text-[11px] uppercase tracking-wide text-[var(--subtext0)] mb-1'

  return (
    <Modal
      open={open}
      title={isCreate ? 'Milestone anlegen' : 'Milestone bearbeiten'}
      onClose={onClose}
      size="md"
      autoFocus={false}
      dialogDataUi={dataUiScope}
      headerActions={
        !isCreate && milestone.key ? (
          <span data-ui={`${dataUiScope}.key`} className="font-mono text-xs text-[var(--subtext0)]">
            {milestone.key}
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} data-ui={`${dataUiScope}.cancel`}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!draft.name.trim()}
            data-ui={`${dataUiScope}.save`}
          >
            {isCreate ? 'Anlegen' : 'Speichern'}
          </Button>
        </>
      }
    >
      <div data-ui={`${dataUiScope}.form`} className="flex flex-col gap-3">
        <div data-ui={`${dataUiScope}.field.name`}>
          <label htmlFor={fid('name')} className={labelCls}>
            Titel
          </label>
          <Input
            id={fid('name')}
            value={draft.name}
            onChange={(e) => patch('name')(e.target.value)}
            placeholder="Milestone-Titel"
            autoFocus
            data-ui={`${dataUiScope}.name`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div data-ui={`${dataUiScope}.field.status`}>
            <span className={labelCls}>Status</span>
            <Select
              value={draft.status}
              options={statusOptions}
              onChange={patch('status')}
              ariaLabel="Status"
              data-ui={`${dataUiScope}.status`}
            />
          </div>
          <div data-ui={`${dataUiScope}.field.target`}>
            <label htmlFor={fid('target')} className={labelCls}>
              Target
            </label>
            <Input
              id={fid('target')}
              value={draft.target}
              onChange={(e) => patch('target')(e.target.value)}
              placeholder="z. B. Q3 2026"
              data-ui={`${dataUiScope}.target`}
            />
          </div>
        </div>

        <div data-ui={`${dataUiScope}.field.description`}>
          <label htmlFor={fid('description')} className={labelCls}>
            Beschreibung
          </label>
          <Textarea
            id={fid('description')}
            value={draft.description}
            onChange={(e) => patch('description')(e.target.value)}
            rows={5}
            placeholder="Worauf zielt dieser Milestone ab?"
            data-ui={`${dataUiScope}.description`}
          />
        </div>
      </div>
    </Modal>
  )
}
