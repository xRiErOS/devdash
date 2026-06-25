import React, { useState, useEffect, useCallback, useRef } from 'react'
import MarkdownField from './MarkdownField.jsx'
import Select from './ui/molecules/Select.jsx'
import Modal from './ui/molecules/Modal.jsx'

// DD-452: SprintCreateModal + SprintEditModal dedupliziert zu einer Komponente.
// Verhalten 1:1 erhalten, Unterschiede bewusst über `mode` gesteuert:
//  - create: Reset-on-close, sparse POST-Body, eigener Focus-Trap + Cmd+S +
//    ESC-blur-vor-close (DD-77/DD-80/DD-97) lokal am dialogRef-Container, Modal
//    mit manageEscape={false} → kein Doppel-ESC. Footer-Buttons sitzen im <form>.
//  - edit: Prefill aus `sprint`, null-expliziter PUT-Body inkl. status/notes,
//    zusätzliche Felder notes (MarkdownField) + status (Select) + DB#-Header.
//    ESC/Backdrop-Close zentral via ui/Modal. Footer via Modal `footer`-Prop,
//    Submit-Button koppelt per form="sprint-edit-form".
const SPRINT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function SprintFormModal({ open, mode = 'create', sprint = null, onClose, onCreated, onUpdated }) {
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
  const [milestones, setMilestones] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const dialogRef = useRef(null)

  // Init-Effect mode-abhängig: create → Reset-on-close (SprintCreateModal),
  // edit → Prefill aus `sprint` (SprintEditModal). Milestones-Load in beiden Zweigen.
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
        setError('')
        fetch('/api/milestones')
          .then(r => r.ok ? r.json() : [])
          .then(d => setMilestones(Array.isArray(d) ? d.filter(m => m.id) : []))
          .catch(() => {})
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
      setError('')
    } else {
      fetch('/api/milestones')
        .then(r => r.ok ? r.json() : [])
        .then(d => setMilestones(Array.isArray(d) ? d.filter(m => m.id) : []))
        .catch(() => {})
    }
  }, [open, isEdit, sprint])

  // DD-77/DD-80/DD-97 (nur create): Esc loest erst Feldfokus, schliesst nur ohne
  // aktiven Feldfokus; Cmd/Ctrl+S/Enter submittet; Tab-Focus-Trap. Im edit-Mode
  // übernimmt ui/Modal das ESC-Close zentral.
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
      e.preventDefault(); onClose(); return
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name ist Pflichtfeld'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        const body = { name: name.trim(), goal: goal.trim() || null, notes }
        body.start_date = startDate || null
        body.end_date = endDate || null
        body.capacity = capacity === '' ? null : Number(capacity)
        body.wip_limit = wipLimit === '' ? null : Number(wipLimit)
        body.status = status
        body.milestone_id = milestoneId === '' ? null : Number(milestoneId)
        const res = await fetch(`/api/sprints/${sprint.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(await res.text())
        const updated = await res.json()
        onUpdated(updated)
        onClose()
      } else {
        const body = { name: name.trim() }
        if (goal.trim()) body.goal = goal.trim()
        if (startDate) body.start_date = startDate
        if (endDate) body.end_date = endDate
        if (capacity) body.capacity = Number(capacity)
        if (wipLimit) body.wip_limit = Number(wipLimit)
        if (milestoneId) body.milestone_id = Number(milestoneId)
        const res = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(await res.text())
        const newSprint = await res.json()
        onCreated(newSprint)
        onClose()
      }
    } catch (err) {
      setError(err.message || (isEdit ? 'Fehler beim Speichern' : 'Fehler beim Erstellen'))
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !sprint) return null

  const labelClass = 'block text-xs font-medium mb-1 text-[var(--subtext0)]'
  const inputClass = 'w-full rounded-lg px-3 py-2 border-0 outline-none text-base bg-[var(--surface0)] text-[var(--text)]'

  // Gemeinsame Felder + mode-abhängige Erweiterungen (notes/status nur edit).
  const fields = (
    <>
      <div data-ui="sprint-create-modal.stammdaten">
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          placeholder="Sprint 21..."
          autoFocus
          data-ui="sprint-create-modal.stammdaten.name"
        />
      </div>
      <div data-ui="sprint-create-modal.goal">
        <label className={labelClass}>Sprintziel</label>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          rows={2}
          className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y text-base min-h-[60px] bg-[var(--surface0)] text-[var(--text)]"
          placeholder="Was soll mit diesem Sprint erreicht werden?"
          data-ui="sprint-create-modal.goal.text"
        />
      </div>
      {isEdit && (
        <div data-ui="sprint-edit-modal.notes">
          <label className={labelClass}>Notizen</label>
          <MarkdownField
            value={notes}
            onChange={setNotes}
            rows={4}
            placeholder="Zusätzliche Notizen, Markdown wird unterstützt."
          />
        </div>
      )}
      <div className="flex gap-3" data-ui="sprint-create-modal.date-range">
        <div className="flex-1">
          <label className={labelClass}>Start</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={inputClass}
            data-ui="sprint-create-modal.date-range.start"
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Ende</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={inputClass}
            data-ui="sprint-create-modal.date-range.end"
          />
        </div>
      </div>
      <div className="flex gap-3" data-ui="sprint-create-modal.capacity">
        <div className="flex-1">
          <label className={labelClass}>Kapazität (Issues)</label>
          <input
            type="number"
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            min="1"
            max="50"
            className={inputClass}
            placeholder={isEdit ? 'optional' : 'z.B. 10'}
            data-ui="sprint-create-modal.capacity.capacity"
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>WIP-Limit</label>
          <input
            type="number"
            value={wipLimit}
            onChange={e => setWipLimit(e.target.value)}
            min="1"
            max="20"
            className={inputClass}
            placeholder="leer = kein Limit"
            title="Max parallele in_progress-Items"
            data-ui="sprint-create-modal.capacity.wip-limit"
          />
        </div>
      </div>
      {isEdit && (
        <div data-ui="sprint-edit-modal.status">
          <label className={labelClass}>Status</label>
          <Select
            value={status}
            onChange={setStatus}
            ariaLabel="Sprint-Status"
            options={SPRINT_STATUSES.map(s => ({ value: s.value, label: s.label }))}
          />
        </div>
      )}
      <div data-ui="sprint-create-modal.milestone">
        <label className={labelClass}>Milestone</label>
        <Select
          value={milestoneId}
          onChange={setMilestoneId}
          ariaLabel="Milestone"
          placeholder="— Kein Milestone —"
          searchable
          wrap
          options={[
            { value: '', label: '— Kein Milestone —' },
            ...milestones.map(m => ({ value: String(m.id), label: m.name, hint: m.target_date || undefined })),
          ]}
          data-ui="sprint-create-modal.milestone.select"
        />
        {isEdit && (
          <p className="text-[11px] mt-1 text-[var(--hint)]">
            Issues dieses Sprints werden automatisch dem Milestone zugeordnet.
          </p>
        )}
      </div>
      {error && <p className="text-xs text-[var(--red)]" data-ui="sprint-create-modal.error">{error}</p>}
    </>
  )

  if (isEdit) {
    const titleNode = (
      <span className="flex items-baseline justify-between gap-2 w-full">
        <span className="font-bold text-base">
          {sprint.project_prefix && sprint.project_number != null
            ? `${sprint.project_prefix}#${sprint.project_number} bearbeiten`
            : sprint.project_number != null ? `Sprint ${sprint.project_number} bearbeiten` : 'Sprint bearbeiten'}
        </span>
        <span className="text-[10px] font-mono text-[var(--hint)]" title="Technische Datenbank-ID">
          DB#{sprint.id}
        </span>
      </span>
    )

    const footer = (
      <>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] bg-[var(--surface1)] text-[var(--text)]"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          form="sprint-edit-form"
          disabled={saving}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] bg-[var(--accent-success)]${saving ? ' opacity-70' : ''}`}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </>
    )

    return (
      <Modal open={open} onClose={onClose} title={titleNode} size="sm" footer={footer}>
        <form id="sprint-edit-form" onSubmit={handleSubmit} className="space-y-3">
          {fields}
        </form>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuen Sprint erstellen" size="sm" manageEscape={false}>
      <div ref={dialogRef}>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3" data-ui="sprint-create-modal.form">
          {fields}
          <div className="flex gap-3 pt-2" data-ui="sprint-create-modal.actions">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] bg-[var(--surface1)] text-[var(--text)]"
              data-ui="sprint-create-modal.actions.cancel"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] bg-[var(--accent-success)]${saving ? ' opacity-70' : ''}`}
              data-ui="sprint-create-modal.actions.save"
            >
              {saving ? 'Erstellen...' : 'Sprint erstellen'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
