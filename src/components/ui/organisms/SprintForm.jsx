/**
 * SprintForm — Organism (06.70 Forms & Criteria, GF-2 A2/D-I). V2-Refactor aus
 * SprintFormModal (TECH-B05): die Form-Felder + Actions sind aus der Modal-Hülle
 * herausgelöst und über eine `chrome`-Abstraktion ('page' inline | 'modal' im
 * Modal-Molecule) wiederverwendbar. Speist den EntityDetail-Edit-Flow (Strukturfelder).
 *
 * Focus-Trap kommt jetzt ZENTRAL aus dem Modal-Molecule (W0-T15, A11Y-B02) — auch im
 * Edit-Mode (SprintFormModal trappte create-only). Kein bespoke keydown-Handler mehr.
 *
 * PRESENTATIONAL/controlled: kein fetch/Store. Felder als ephemerer useState; Mutation
 * via onSubmit({mode,sprintId,values}); In-Flight via `submitting`, Fehler via `error`.
 * Additiv/back-compat: SprintFormModal bleibt für bestehende Consumer (D-I).
 *
 * @param {object} props
 * @param {'create'|'edit'} [props.mode='create']
 * @param {'page'|'modal'} [props.chrome='modal'] - 'modal' → Modal-Molecule (Backdrop+Panel+
 *   Focus-Trap+ESC); 'page' → Inline-Body (dedizierte Einbettung, EntityDetail-Edit-Slot).
 * @param {boolean} [props.open=true] - nur chrome='modal': Modal-Sichtbarkeit.
 * @param {object|null} [props.sprint] - Prefill im edit-Mode ({id,name,goal,notes,start_date,
 *   end_date,capacity,wip_limit,status,milestone_id,project_prefix?,project_number?}).
 * @param {Array<{id:number,name:string,target_date?:string}>} [props.milestones=[]]
 * @param {boolean} [props.submitting=false] - Submit in-flight (Trigger disabled).
 * @param {string} [props.error=''] - extern gemeldeter Fehlertext.
 * @param {(payload:{mode:'create'|'edit',sprintId:?number,values:object})=>void} [props.onSubmit]
 * @param {()=>void} [props.onClose] - Abbrechen / Schließen.
 * @param {string} [props.dataUiScope='sprint-form'] - Wurzel-data-ui-bereich.
 */
import { useEffect, useId, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Select from '../molecules/Select.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

const SPRINT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function SprintForm({
  mode = 'create',
  chrome = 'modal',
  open = true,
  sprint = null,
  milestones = [],
  submitting = false,
  error = '',
  onSubmit,
  onClose,
  dataUiScope = 'sprint-form',
}) {
  const isEdit = mode === 'edit'

  const [name, setName] = useState(sprint?.name || '')
  const [goal, setGoal] = useState(sprint?.goal || '')
  const [notes, setNotes] = useState(sprint?.notes || '')
  const [startDate, setStartDate] = useState(sprint?.start_date ? sprint.start_date.slice(0, 10) : '')
  const [endDate, setEndDate] = useState(sprint?.end_date ? sprint.end_date.slice(0, 10) : '')
  const [capacity, setCapacity] = useState(sprint?.capacity != null ? String(sprint.capacity) : '')
  const [wipLimit, setWipLimit] = useState(sprint?.wip_limit != null ? String(sprint.wip_limit) : '')
  const [status, setStatus] = useState(sprint?.status || 'planning')
  const [milestoneId, setMilestoneId] = useState(sprint?.milestone_id != null ? String(sprint.milestone_id) : '')
  const [localError, setLocalError] = useState('')

  // Re-Prefill bei Sprint-Wechsel im Edit-Mode (controlled Open).
  useEffect(() => {
    if (!isEdit || !sprint) return
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
  }, [isEdit, sprint])

  const submit = (e) => {
    e?.preventDefault?.()
    if (!name.trim()) { setLocalError('Name ist Pflichtfeld'); return }
    setLocalError('')
    if (isEdit) {
      onSubmit?.({
        mode: 'edit',
        sprintId: sprint?.id ?? null,
        values: {
          name: name.trim(), goal: goal.trim() || null, notes,
          start_date: startDate || null, end_date: endDate || null,
          capacity: capacity === '' ? null : Number(capacity),
          wip_limit: wipLimit === '' ? null : Number(wipLimit),
          status, milestone_id: milestoneId === '' ? null : Number(milestoneId),
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

  const shownError = error || localError
  const labelClass = 'block text-xs font-medium mb-1 text-[var(--subtext0)]'
  // A11Y (B01): label↔control via htmlFor/id (useId = instanz-eindeutig). Macht
  // getByLabelText nutzbar — der kanonische play-Selektor.
  const fid = useId()
  const milestoneOptions = [
    { value: '', label: '— Kein Milestone —' },
    ...milestones.filter((m) => m.id != null).map((m) => ({ value: String(m.id), label: m.name, hint: m.target_date || undefined })),
  ]

  const body = (
    <form onSubmit={submit} className="space-y-3 [font-family:var(--font-display)]" data-ui={`${dataUiScope}.form`}>
      <div data-ui={`${dataUiScope}.stammdaten`}>
        <label htmlFor={`${fid}-name`} className={labelClass}>Name *</label>
        <Input id={`${fid}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 21…" autoFocus data-ui={`${dataUiScope}.stammdaten.name`} />
      </div>
      <div data-ui={`${dataUiScope}.goal`}>
        <label htmlFor={`${fid}-goal`} className={labelClass}>Sprintziel</label>
        <Textarea id={`${fid}-goal`} value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} className="min-h-[60px]" placeholder="Was soll mit diesem Sprint erreicht werden?" data-ui={`${dataUiScope}.goal.text`} />
      </div>
      {isEdit && (
        <div data-ui={`${dataUiScope}.notes`}>
          <label className={labelClass}>Notizen</label>
          <MarkdownField value={notes} onChange={setNotes} rows={4} placeholder="Zusätzliche Notizen, Markdown wird unterstützt." />
        </div>
      )}
      <div className="flex gap-3" data-ui={`${dataUiScope}.date-range`}>
        <div className="flex-1">
          <label htmlFor={`${fid}-start`} className={labelClass}>Start</label>
          <Input id={`${fid}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-ui={`${dataUiScope}.date-range.start`} />
        </div>
        <div className="flex-1">
          <label htmlFor={`${fid}-end`} className={labelClass}>Ende</label>
          <Input id={`${fid}-end`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-ui={`${dataUiScope}.date-range.end`} />
        </div>
      </div>
      <div className="flex gap-3" data-ui={`${dataUiScope}.capacity`}>
        <div className="flex-1">
          <label htmlFor={`${fid}-capacity`} className={labelClass}>Kapazität (Issues)</label>
          <Input id={`${fid}-capacity`} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} min="1" max="50" placeholder={isEdit ? 'optional' : 'z.B. 10'} data-ui={`${dataUiScope}.capacity.capacity`} />
        </div>
        <div className="flex-1">
          <label htmlFor={`${fid}-wip`} className={labelClass}>WIP-Limit</label>
          <Input id={`${fid}-wip`} type="number" value={wipLimit} onChange={(e) => setWipLimit(e.target.value)} min="1" max="20" placeholder="leer = kein Limit" title="Max parallele in_progress-Items" data-ui={`${dataUiScope}.capacity.wip-limit`} />
        </div>
      </div>
      {isEdit && (
        <div data-ui={`${dataUiScope}.status`}>
          <label className={labelClass}>Status</label>
          <Select value={status} onChange={setStatus} ariaLabel="Sprint-Status" options={SPRINT_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
        </div>
      )}
      <div data-ui={`${dataUiScope}.milestone`}>
        <label className={labelClass}>Milestone</label>
        <Select value={milestoneId} onChange={setMilestoneId} ariaLabel="Milestone" placeholder="— Kein Milestone —" searchable wrap options={milestoneOptions} data-ui={`${dataUiScope}.milestone.select`} />
        {isEdit && <p className="text-[11px] mt-1 text-[var(--subtext0)]">Issues dieses Sprints werden automatisch dem Milestone zugeordnet.</p>}
      </div>
      {shownError && <p className="text-xs text-[var(--accent-danger)]" data-ui={`${dataUiScope}.error`}>{shownError}</p>}
      <div className="flex gap-3 pt-2" data-ui={`${dataUiScope}.actions`}>
        <Button variant="secondary" size="lg" onClick={onClose} className="flex-1" data-ui={`${dataUiScope}.actions.cancel`}>Abbrechen</Button>
        <Button variant="primary" size="lg" type="submit" loading={submitting} disabled={submitting} className="flex-1" data-ui={`${dataUiScope}.actions.save`}>
          {isEdit ? (submitting ? 'Speichern…' : 'Speichern') : (submitting ? 'Erstellen…' : 'Sprint erstellen')}
        </Button>
      </div>
    </form>
  )

  if (chrome === 'modal') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        busy={submitting}
        title={isEdit ? 'Sprint bearbeiten' : 'Neuen Sprint erstellen'}
        size="sm"
        backdropDataUi={`${dataUiScope}.backdrop`}
        dialogDataUi={dataUiScope}
      >
        {body}
      </Modal>
    )
  }

  // chrome='page': Inline-Body (EntityDetail-Edit-Slot / dedizierte Einbettung).
  return (
    <div data-ui={dataUiScope} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--layer-3)] p-4">
      {body}
    </div>
  )
}
