/**
 * IssueForm — Organism (06.70 Forms & Criteria, GF-2 Backlog-Pane V2 T1).
 * xForm-Pattern analog SprintForm: Felder + Actions aus der Modal-Hülle herausgelöst,
 * chrome-Abstraktion ('page' inline | 'modal' via Modal-Molecule).
 *
 * Entscheidungen (PO 2026-06-24):
 *   D04 — Milestone NICHT editierbar (folgt aus Sprint-Zuordnung) → kein Milestone-Feld.
 *   D05 — kein inline-Edit mehr; D06 — Edit immer via Pencil→Form-Overlay.
 *
 * PRESENTATIONAL/controlled: kein fetch/Store. Felder als ephemerer useState; Mutation
 * via onSubmit({mode, issueId, values}); In-Flight via `submitting`, Fehler via `error`.
 * Submit-Payload mappt auf backlog.contracts.js (issueCreateContract / issueUpdateContract).
 *
 * @param {object} props
 * @param {'create'|'edit'} [props.mode='edit']
 * @param {'page'|'modal'} [props.chrome='modal'] - 'modal' → Modal-Molecule (Backdrop+Panel+
 *   Focus-Trap+ESC); 'page' → Inline-Body (dedizierte Einbettung, EntityDetail-Edit-Slot).
 * @param {boolean} [props.open=true] - nur chrome='modal': Modal-Sichtbarkeit.
 * @param {object|null} [props.issue] - Prefill im edit-Mode ({id,title,type,priority,
 *   sprint_id,po_notes,description,...}).
 * @param {Array<{value:string|number,label:string}>} [props.sprintOptions=[]]
 * @param {Array<{value:string,label:string}>} [props.typeOptions] - Default: ISSUE_TYPES
 * @param {Array<{value:string|number,label:string}>} [props.priorityOptions] - Default: 1–5
 * @param {boolean} [props.submitting=false] - Submit in-flight (Button disabled).
 * @param {string} [props.error=''] - extern gemeldeter Fehlertext.
 * @param {(payload:{mode:'create'|'edit',issueId:number|null,values:object})=>void} [props.onSubmit]
 * @param {()=>void} [props.onClose] - Abbrechen / Schließen.
 * @param {string} [props.dataUiScope='issue-form'] - Wurzel-data-ui-Bereich.
 */
import { useEffect, useId, useState } from 'react'
import Modal from '../molecules/Modal.jsx'
import Select from '../molecules/Select.jsx'
import MarkdownField from '../molecules/MarkdownField.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'
import { ISSUE_TYPES } from '@devd/api-types/backlog.contracts.js'

const DEFAULT_TYPE_OPTIONS = ISSUE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))

const DEFAULT_PRIORITY_OPTIONS = [
  { value: 1, label: '1 — Kritisch' },
  { value: 2, label: '2 — Hoch' },
  { value: 3, label: '3 — Mittel' },
  { value: 4, label: '4 — Niedrig' },
  { value: 5, label: '5 — Nice-to-have' },
]

export default function IssueForm({
  mode = 'edit',
  chrome = 'modal',
  open = true,
  issue = null,
  sprintOptions = [],
  typeOptions = DEFAULT_TYPE_OPTIONS,
  priorityOptions = DEFAULT_PRIORITY_OPTIONS,
  submitting = false,
  error = '',
  onSubmit,
  onClose,
  dataUiScope = 'issue-form',
}) {
  const isEdit = mode === 'edit'
  const fid = useId()

  // Select-Werte werden konsequent als String geführt (Muster SprintForm: `Select`
  // preselektiert per strikter Gleichheit `o.value === value`, daher müssen bound value
  // UND Option-Values denselben Typ haben). T2-Robustheit: typeOptions/priorityOptions/
  // sprintOptions dürfen String- ODER Number-`value`s liefern (typisch JSON aus useBacklog).
  const defaultType = typeOptions[0]?.value ?? ISSUE_TYPES[0]
  const [title, setTitle] = useState(issue?.title || '')
  const [type, setType] = useState(issue?.type || defaultType)
  const [priority, setPriority] = useState(issue?.priority != null ? String(issue.priority) : '')
  const [sprintId, setSprintId] = useState(issue?.sprint_id != null ? String(issue.sprint_id) : '')
  const [poNotes, setPoNotes] = useState(issue?.po_notes || '')
  const [description, setDescription] = useState(issue?.description || '')
  const [localError, setLocalError] = useState('')

  // Re-Prefill bei Issue-Wechsel im Edit-Mode (controlled Open).
  useEffect(() => {
    if (!isEdit || !issue) return
    setTitle(issue.title || '')
    setType(issue.type || defaultType)
    setPriority(issue.priority != null ? String(issue.priority) : '')
    setSprintId(issue.sprint_id != null ? String(issue.sprint_id) : '')
    setPoNotes(issue.po_notes || '')
    setDescription(issue.description || '')
    setLocalError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, issue])

  const submit = (e) => {
    e?.preventDefault?.()
    if (!title.trim()) {
      setLocalError('Titel ist Pflichtfeld')
      return
    }
    if (!type) {
      setLocalError('Typ ist Pflichtfeld')
      return
    }
    setLocalError('')

    if (isEdit) {
      const values = {
        title: title.trim(),
        type,
        priority: priority === '' ? null : Number(priority),
        sprint_id: sprintId === '' ? null : Number(sprintId),
        po_notes: poNotes || null,
        description: description || null,
      }
      onSubmit?.({ mode: 'edit', issueId: issue?.id ?? null, values })
      return
    }

    // create: nur gesetzte Felder (contract: issueCreateContract)
    const values = { title: title.trim(), type }
    if (priority !== '') values.priority = Number(priority)
    if (sprintId !== '') values.sprint_id = Number(sprintId)
    if (poNotes.trim()) values.po_notes = poNotes.trim()
    if (description.trim()) values.description = description.trim()
    onSubmit?.({ mode: 'create', issueId: null, values })
  }

  // Keyboard-Shortcuts (Muster MilestoneForm L93-120): ESC blurrt ein fokussiertes
  // Feld, sonst Abbruch; Cmd/Ctrl+S bzw. Cmd/Ctrl+Enter speichert (gleicher submit-Pfad
  // wie der Button). A11Y-B04 (W0-T15): globaler document-keydown-Listener NUR im
  // Modal-Modus — im page/inline-chrome würde er fremde ESC/Cmd+S-Eingaben hijacken
  // (kein Modal-Kontext → kein globaler Hijack).
  useEffect(() => {
    if (chrome !== 'modal') return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const el = document.activeElement
        const tag = el?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
          e.preventDefault()
          el.blur()
          return
        }
        e.preventDefault(); onClose?.(); return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault()
        submit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, type, priority, sprintId, poNotes, description, chrome])

  const shownError = error || localError
  const labelClass = 'block text-xs font-medium mb-1 text-[var(--subtext0)]'

  // Option-Values als String normalisieren (Muster SprintForm `String(m.id)`), damit der
  // String-gehaltene bound value per strikter Gleichheit preselektiert — egal ob die
  // Optionen Number- (Defaults) oder String-`value`s (T2-JSON) tragen.
  const prioritySelectOptions = [
    { value: '', label: '— Keine Priorität —' },
    ...priorityOptions.map((p) => ({ value: String(p.value), label: p.label })),
  ]
  const sprintSelectOptions = [
    { value: '', label: '— Kein Sprint —' },
    ...sprintOptions.map((s) => ({ value: String(s.value), label: s.label })),
  ]

  const body = (
    <form
      onSubmit={submit}
      className="space-y-3 [font-family:var(--font-display)]"
      data-ui={`${dataUiScope}.form`}
    >
      {/* Title — Pflichtfeld */}
      <div data-ui={`${dataUiScope}.title`}>
        <label htmlFor={`${fid}-title`} className={labelClass}>Titel *</label>
        <Input
          id={`${fid}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue-Titel…"
          autoFocus
          data-ui={`${dataUiScope}.title.input`}
        />
      </div>

      {/* Type — Pflichtfeld */}
      <div data-ui={`${dataUiScope}.type`}>
        <label className={labelClass}>Typ *</label>
        <Select
          value={type}
          options={typeOptions}
          onChange={setType}
          ariaLabel="Issue-Typ"
          data-ui={`${dataUiScope}.type.select`}
        />
      </div>

      {/* Priority */}
      <div data-ui={`${dataUiScope}.priority`}>
        <label className={labelClass}>Priorität</label>
        <Select
          value={priority}
          options={prioritySelectOptions}
          onChange={setPriority}
          ariaLabel="Issue-Priorität"
          data-ui={`${dataUiScope}.priority.select`}
        />
      </div>

      {/* Sprint */}
      <div data-ui={`${dataUiScope}.sprint`}>
        <label className={labelClass}>Sprint</label>
        <Select
          value={sprintId}
          options={sprintSelectOptions}
          onChange={setSprintId}
          ariaLabel="Sprint-Zuordnung"
          data-ui={`${dataUiScope}.sprint.select`}
        />
      </div>

      {/* PO Notes — Markdown */}
      <div data-ui={`${dataUiScope}.po-notes`}>
        <label className={labelClass}>PO-Notizen</label>
        <MarkdownField
          value={poNotes}
          onChange={setPoNotes}
          rows={3}
          placeholder="Notizen für den PO (Markdown)…"
        />
      </div>

      {/* Description — Markdown */}
      <div data-ui={`${dataUiScope}.description`}>
        <label className={labelClass}>Beschreibung</label>
        <MarkdownField
          value={description}
          onChange={setDescription}
          rows={4}
          placeholder="Detaillierte Beschreibung des Issues (Markdown)…"
        />
      </div>

      {/* Error */}
      {shownError && (
        <p
          className="text-xs text-[var(--accent-danger)]"
          data-ui={`${dataUiScope}.error`}
        >
          {shownError}
        </p>
      )}

      {/* Actions */}
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
          className="flex-1"
          data-ui={`${dataUiScope}.actions.save`}
        >
          {isEdit
            ? submitting ? 'Speichern…' : 'Speichern'
            : submitting ? 'Erstellen…' : 'Issue erstellen'}
        </Button>
      </div>
    </form>
  )

  if (chrome === 'modal') {
    // manageEscape={false} (Muster MilestoneForm L250): der eigene ESC-blur/Cmd+S-Handler
    // greift; der Tab-Focus-Trap läuft im Modal unabhängig von ESC. Sonst Doppel-Handling.
    return (
      <Modal
        open={open}
        onClose={onClose}
        busy={submitting}
        manageEscape={false}
        title={isEdit ? 'Issue bearbeiten' : 'Neues Issue erstellen'}
        size="lg"
        backdropDataUi={`${dataUiScope}.backdrop`}
        dialogDataUi={dataUiScope}
      >
        {body}
      </Modal>
    )
  }

  // chrome='page': Inline-Body (EntityDetail-Edit-Slot / dedizierte Einbettung).
  return (
    <div
      data-ui={dataUiScope}
      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--layer-3)] p-4"
    >
      {body}
    </div>
  )
}
