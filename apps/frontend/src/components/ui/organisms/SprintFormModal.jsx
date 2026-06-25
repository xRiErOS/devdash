/**
 * SprintFormModal — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/SprintFormModal.jsx, DD-452).
 *
 * Domänen-bewusste Einheit: Sprint-CRUD-Formular-Modal (create/edit) mit
 * Datum-Picker, Kapazität/WIP-Limit, optionaler Milestone-Zuweisung und (im
 * Edit-Modus) Status + Notizen. Komponiert das Modal-Molecule (Wrapper/Backdrop/
 * Footer), das Input-/Textarea-/Button-Atom, das Select-Molecule (Status +
 * Milestone) und das MarkdownField-Molecule (Notizen).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die Milestone-Liste via `fetch('/api/milestones')` in einem
 *    useEffect. Die Liste kommt jetzt als `milestones`-Prop herein.
 *  - Quelle submittete create via `fetch('/api/sprints', POST)` bzw. edit via
 *    `fetch('/api/sprints/:id', PUT)` inkl. lokalem saving-State + try/catch und
 *    rief `onCreated(newSprint)`/`onUpdated(updated)`. Beides ist hier zur einen
 *    Callback-Prop `onSubmit({ mode, sprintId, values })` gehoben; der In-Flight-
 *    Zustand kommt als `submitting`-Prop, der Fehlertext als `error`-Prop.
 *
 * Ephemerer UI-State (BLEIBT lokal): alle Formularfelder (name/goal/notes/
 * startDate/endDate/capacity/wipLimit/status/milestoneId) als useState, der
 * lokale Validierungsfehler (`localError`), die Refs für Focus-Trap, sowie der
 * Keyboard-Handler (ESC-blur-vor-close + Cmd/Ctrl+S/Enter + Tab-Focus-Trap, nur
 * create — DD-77/DD-80/DD-97). Im edit-Modus übernimmt das Modal das ESC-Close.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {'create'|'edit'} [props.mode='create']
 * @param {object|null} [props.sprint] - Prefill-Datensatz im edit-Modus:
 *        { id, name, goal, notes, start_date, end_date, capacity, wip_limit,
 *          status, milestone_id, project_prefix?, project_number? }
 * @param {Array<{id:number,name:string,target_date?:string}>} [props.milestones=[]] - Milestone-Optionen (gehoben)
 * @param {boolean} [props.submitting=false] - Submit in-flight (gehoben)
 * @param {string} [props.error=''] - Server-/Submit-Fehlertext (gehoben)
 * @param {(payload:{mode:'create'|'edit',sprintId:?number,values:object})=>void} [props.onSubmit] - Submit (gehoben)
 * @param {()=>void} [props.onClose] - Modal schliessen/abbrechen
 * @param {string} [props.dataUiScope='sprint-form-modal'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Select from '../molecules/Select.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

// Sprint-Lifecycle-Status — statische Optionen (kein String-Interpolation).
const SPRINT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function SprintFormModal({
  open,
  mode = 'create',
  sprint = null,
  milestones = [],
  submitting = false,
  error = '',
  onSubmit,
  onClose,
  dataUiScope = 'sprint-form-modal',
}) {
  const isEdit = mode === 'edit'

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [wipLimit, setWipLimit] = useState('')
  const [status, setStatus] = useState('planning')
  const [milestoneId, setMilestoneId] = useState('')
  const [localError, setLocalError] = useState('')
  const formRef = useRef(null)
  const dialogRef = useRef(null)

  // Init-Effect mode-abhängig: create → Reset-on-close, edit → Prefill aus `sprint`.
  useEffect(() => {
    if (isEdit) {
      if (open && sprint) {
        setName(sprint.name || '')
        setGoal(sprint.goal || '')
        setNotes(sprint.notes || '')
        setStartDate(sprint.start_date ? sprint.start_date.slice(0, 10) : '')
        setEndDate(sprint.end_date ? sprint.end_date.slice(0, 10) : '')
        setCapacity(sprint.capacity != null ? String(sprint.capacity) : '')
        setWipLimit(sprint.wip_limit != null ? String(sprint.wip_limit) : '')
        setStatus(sprint.status || 'planning')
        setMilestoneId(sprint.milestone_id != null ? String(sprint.milestone_id) : '')
        setLocalError('')
      }
      return
    }
    if (!open) {
      setName('')
      setGoal('')
      setStartDate('')
      setEndDate('')
      setCapacity('')
      setWipLimit('')
      setMilestoneId('')
      setLocalError('')
    }
  }, [open, isEdit, sprint])

  // DD-77/DD-80/DD-97 (nur create): Esc loest erst Feldfokus, schliesst nur ohne
  // aktiven Feldfokus; Cmd/Ctrl+S/Enter submittet; Tab-Focus-Trap. Im edit-Mode
  // übernimmt das Modal das ESC-Close zentral.
  const handleKey = useCallback((e) => {
    if (!open || isEdit) return
    if (e.key === 'Escape') {
      const el = document.activeElement
      const tag = el?.tagName?.toLowerCase()
      if (
        dialogRef.current?.contains(el) &&
        (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable)
      ) {
        e.preventDefault()
        el.blur()
        return
      }
      e.preventDefault(); onClose?.(); return
    }
    const isMod = e.metaKey || e.ctrlKey
    if (isMod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
      e.preventDefault()
      formRef.current?.requestSubmit()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusables = dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [open, isEdit, onClose])

  useEffect(() => {
    if (isEdit) return
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, isEdit, handleKey])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) { setLocalError('Name ist Pflichtfeld'); return }
    setLocalError('')
    if (isEdit) {
      onSubmit?.({
        mode: 'edit',
        sprintId: sprint?.id ?? null,
        values: {
          name: name.trim(),
          goal: goal.trim() || null,
          notes,
          start_date: startDate || null,
          end_date: endDate || null,
          capacity: capacity === '' ? null : Number(capacity),
          wip_limit: wipLimit === '' ? null : Number(wipLimit),
          status,
          milestone_id: milestoneId === '' ? null : Number(milestoneId),
        },
      })
      return
    }
    const values = { name: name.trim() }
    if (goal.trim()) values.goal = goal.trim()
    if (startDate) values.start_date = startDate
    if (endDate) values.end_date = endDate
    if (capacity) values.capacity = Number(capacity)
    if (wipLimit) values.wip_limit = Number(wipLimit)
    if (milestoneId) values.milestone_id = Number(milestoneId)
    onSubmit?.({ mode: 'create', sprintId: null, values })
  }

  if (!open) return null
  if (isEdit && !sprint) return null

  const shownError = error || localError
  const labelClass = 'block text-xs font-medium mb-1 text-[var(--subtext0)]'
  const milestoneOptions = [
    { value: '', label: '— Kein Milestone —' },
    ...milestones
      .filter((m) => m.id != null)
      .map((m) => ({ value: String(m.id), label: m.name, hint: m.target_date || undefined })),
  ]

  // Gemeinsame Felder + mode-abhängige Erweiterungen (notes/status nur edit).
  const fields = (
    <>
      <div data-ui={`${dataUiScope}.stammdaten`}>
        <label className={labelClass}>Name *</label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sprint 21..."
          autoFocus
          data-ui={`${dataUiScope}.stammdaten.name`}
        />
      </div>
      <div data-ui={`${dataUiScope}.goal`}>
        <label className={labelClass}>Sprintziel</label>
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          className="min-h-[60px]"
          placeholder="Was soll mit diesem Sprint erreicht werden?"
          data-ui={`${dataUiScope}.goal.text`}
        />
      </div>
      {isEdit && (
        <div data-ui={`${dataUiScope}.notes`}>
          <label className={labelClass}>Notizen</label>
          <MarkdownField
            value={notes}
            onChange={setNotes}
            rows={4}
            placeholder="Zusätzliche Notizen, Markdown wird unterstützt."
          />
        </div>
      )}
      <div className="flex gap-3" data-ui={`${dataUiScope}.date-range`}>
        <div className="flex-1">
          <label className={labelClass}>Start</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-ui={`${dataUiScope}.date-range.start`}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Ende</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-ui={`${dataUiScope}.date-range.end`}
          />
        </div>
      </div>
      <div className="flex gap-3" data-ui={`${dataUiScope}.capacity`}>
        <div className="flex-1">
          <label className={labelClass}>Kapazität (Issues)</label>
          <Input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            min="1"
            max="50"
            placeholder={isEdit ? 'optional' : 'z.B. 10'}
            data-ui={`${dataUiScope}.capacity.capacity`}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>WIP-Limit</label>
          <Input
            type="number"
            value={wipLimit}
            onChange={(e) => setWipLimit(e.target.value)}
            min="1"
            max="20"
            placeholder="leer = kein Limit"
            title="Max parallele in_progress-Items"
            data-ui={`${dataUiScope}.capacity.wip-limit`}
          />
        </div>
      </div>
      {isEdit && (
        <div data-ui={`${dataUiScope}.status`}>
          <label className={labelClass}>Status</label>
          <Select
            value={status}
            onChange={setStatus}
            ariaLabel="Sprint-Status"
            options={SPRINT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>
      )}
      <div data-ui={`${dataUiScope}.milestone`}>
        <label className={labelClass}>Milestone</label>
        <Select
          value={milestoneId}
          onChange={setMilestoneId}
          ariaLabel="Milestone"
          placeholder="— Kein Milestone —"
          searchable
          wrap
          options={milestoneOptions}
          data-ui={`${dataUiScope}.milestone.select`}
        />
        {isEdit && (
          <p className="text-[11px] mt-1 text-[var(--subtext0)]">
            Issues dieses Sprints werden automatisch dem Milestone zugeordnet.
          </p>
        )}
      </div>
      {shownError && (
        <p className="text-xs text-[var(--accent-danger)]" data-ui={`${dataUiScope}.error`}>
          {shownError}
        </p>
      )}
    </>
  )

  if (isEdit) {
    const titleNode = (
      <span className="flex items-baseline justify-between gap-2 w-full" data-ui={`${dataUiScope}.title`}>
        <span className="font-bold text-base">
          {sprint.project_prefix && sprint.project_number != null
            ? `${sprint.project_prefix}#${sprint.project_number} bearbeiten`
            : sprint.project_number != null ? `Sprint ${sprint.project_number} bearbeiten` : 'Sprint bearbeiten'}
        </span>
        <span className="text-[10px] font-mono text-[var(--subtext0)]" title="Technische Datenbank-ID">
          DB#{sprint.id}
        </span>
      </span>
    )

    const footer = (
      <>
        <Button
          variant="secondary"
          size="lg"
          onClick={onClose}
          className="flex-1"
          data-ui={`${dataUiScope}.cancel`}
        >
          Abbrechen
        </Button>
        <Button
          variant="primary"
          size="lg"
          type="submit"
          form="sprint-edit-form"
          loading={submitting}
          disabled={submitting}
          className="flex-1 bg-[var(--accent-success)] text-[var(--on-accent)]"
          data-ui={`${dataUiScope}.save`}
        >
          {submitting ? 'Speichern…' : 'Speichern'}
        </Button>
      </>
    )

    return (
      <Modal
        open={open}
        onClose={onClose}
        busy={submitting}
        title={titleNode}
        size="sm"
        footer={footer}
        backdropDataUi={`${dataUiScope}.backdrop`}
        dialogDataUi={dataUiScope}
      >
        <form id="sprint-edit-form" onSubmit={handleSubmit} className="space-y-3" data-ui={`${dataUiScope}.form`}>
          {fields}
        </form>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      title="Neuen Sprint erstellen"
      size="sm"
      manageEscape={false}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <div ref={dialogRef}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3" data-ui={`${dataUiScope}.form`}>
          {fields}
          <div className="flex gap-3 pt-2" data-ui={`${dataUiScope}.actions`}>
            <Button
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="flex-1"
              data-ui={`${dataUiScope}.actions.cancel`}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="lg"
              type="submit"
              loading={submitting}
              disabled={submitting}
              className="flex-1 bg-[var(--accent-success)] text-[var(--on-accent)]"
              data-ui={`${dataUiScope}.actions.save`}
            >
              {submitting ? 'Erstellen…' : 'Sprint erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
