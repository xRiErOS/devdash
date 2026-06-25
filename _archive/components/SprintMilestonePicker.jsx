// DD-293 — SprintMilestonePicker
// DD-309 — Migration HTML-select-Element → Select.jsx (Combobox mit Truncate +
// searchable + kbd-nav) damit die UI bei langen Milestone-Namen nicht bricht.
//
// Wird in zwei Kontexten genutzt:
//   1. RoadmapBoard → Backfill-Sektion (Sprints mit milestone_id IS NULL und
//      status IN ('completed','review','closed')).
//   2. SprintDetail → Quick-Edit im Header.
//
// Props:
//   - sprint:      { id, milestone_id, project_id, ... }
//   - milestones:  [{ id, name, status, project_id }]
//   - onChange(milestoneIdOrNull, opts?): callback nach erfolgreichem PUT.
//   - disabled:    optional
//   - testId:      optional data-testid
//
// Persistenz: Schreibt direkt via PUT /api/sprints/:id mit { milestone_id }.
// Diff-Audit-Log wird serverseitig erzeugt (action='sprint_milestone_assign').

import React, { useCallback, useMemo, useState } from 'react'
import Select from './ui/molecules/Select.jsx'

const NO_MILESTONE = '__none__'

export default function SprintMilestonePicker({
  sprint,
  milestones = [],
  onChange,
  disabled = false,
  testId = 'sprint-milestone-picker',
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Milestones gleichen Projekts. Reached-Milestones erscheinen, sind aber
  // serverseitig 422-blockiert — Picker lässt sie wählbar damit der User
  // den Backend-Fehler sieht (DD-173-Konsistenz).
  const projectMilestones = useMemo(() => {
    if (!sprint) return []
    return milestones
      .filter(m => m && m.id != null)
      .filter(m => sprint.project_id == null || m.project_id == null || m.project_id === sprint.project_id)
      .slice()
      .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id))
  }, [milestones, sprint])

  const options = useMemo(() => [
    { value: NO_MILESTONE, label: '— Kein Milestone —' },
    ...projectMilestones.map(m => ({
      value: String(m.id),
      label: `${m.name}${m.status === 'completed' ? ' (abgeschlossen)' : ''}`,
      hint: `M${m.id}`,
    })),
  ], [projectMilestones])

  const currentValue = sprint?.milestone_id != null ? String(sprint.milestone_id) : NO_MILESTONE

  const handleChange = useCallback(async (raw) => {
    const nextId = raw === NO_MILESTONE ? null : Number(raw)
    if (!sprint?.id) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: nextId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const updated = await res.json().catch(() => null)
      onChange?.(nextId, { updated })
    } catch (err) {
      setError(err?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }, [sprint, onChange])

  const currentLabel = options.find(o => o.value === currentValue)?.label || ''

  return (
    <div
      data-testid={testId}
      title={currentLabel}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: '260px',
        maxWidth: '480px',
      }}
    >
      <Select
        value={currentValue}
        options={options}
        onChange={handleChange}
        searchable
        wrap
        disabled={disabled || saving}
        size="sm"
        ariaLabel="Sprint einem Milestone zuordnen"
        placeholder="— Kein Milestone —"
      />
      {error && (
        <span
          data-testid={`${testId}-error`}
          style={{ fontSize: '11px', color: 'var(--accent-danger, var(--red))' }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
