/**
 * SprintMilestonePicker — Organism (DD-481 Phase-4 Harvest aus components/SprintMilestonePicker.jsx).
 *
 * Domänen-bewusst: ordnet einen Sprint einem Milestone zu (Domäne: Sprint × Milestone).
 * Komponiert das ../molecules/Select.jsx (Combobox mit Truncate + searchable + kbd-nav,
 * DD-309) und nutzt den ../atoms/MilestonePill.jsx zum Anzeigen der aktuell zugeordneten
 * Milestone-Kennung neben dem Picker.
 *
 * Gehobene Kopplung (PRESENTATIONAL, D-Phase3-01):
 *   - Der eingebettete `fetch('/api/sprints/:id', { method:'PUT', body:{ milestone_id }})`
 *     wurde ENTFERNT. Die Persistenz ist jetzt Sache des Parents: dieser kommt als
 *     `onChange(milestoneIdOrNull, opts?)`-Callback rein. Gibt der Callback ein Promise
 *     zurück, übernimmt der Picker den lokalen Saving-/Error-State (ephemer) drumherum;
 *     synchrone Callbacks funktionieren ebenso.
 *   - `milestones` und `sprint` kommen als reine Daten-Props rein (kein Store, kein Fetch).
 *
 * Ephemerer UI-State bleibt: `saving` (Pending-Disable), `error` (Fehlertext aus dem
 * abgelehnten Callback-Promise). Kein Daten-State.
 *
 * @param {object} props
 * @param {{ id, milestone_id, project_id }} props.sprint - der zu verortende Sprint
 * @param {Array<{ id, name, status?, project_id?, position? }>} [props.milestones]
 * @param {(milestoneIdOrNull: number|null, opts?: object) => (void|Promise<any>)} props.onChange
 *        - Mutations-Callback. Darf ein Promise zurückgeben (dann Saving-/Error-Handling).
 * @param {boolean} [props.disabled]
 * @param {string} [props.dataUiScope='sprint-milestone-picker'] - parametrisierter Wurzel-bereich (I03).
 * @param {string} [props.testId='sprint-milestone-picker'] - data-testid am Wurzel-Element.
 */
import { useCallback, useMemo, useState } from 'react'
import Select from '../molecules/Select.jsx'
import EntityPill from '../atoms/EntityPill.jsx'

const NO_MILESTONE = '__none__'

export default function SprintMilestonePicker({
  sprint,
  milestones = [],
  onChange,
  disabled = false,
  dataUiScope = 'sprint-milestone-picker',
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
      // Persistenz liegt beim Parent (gehoben aus dem alten fetch/PUT).
      await onChange?.(nextId)
    } catch (err) {
      setError(err?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }, [sprint, onChange])

  const currentLabel = options.find(o => o.value === currentValue)?.label || ''
  const assignedId = sprint?.milestone_id != null ? sprint.milestone_id : null

  return (
    <div
      data-ui={dataUiScope}
      data-testid={testId}
      title={currentLabel}
      className="inline-flex flex-col gap-1 min-w-[260px] max-w-[480px]"
    >
      <div data-ui={`${dataUiScope}.row`} className="flex items-center gap-2 min-w-0">
        <div data-ui={`${dataUiScope}.select`} className="flex-1 min-w-0">
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
        </div>
        {assignedId != null && (
          <EntityPill
            id={`M${assignedId}`}
            entity="milestone"
            data-ui={`${dataUiScope}.pill`}
            title={currentLabel}
            className="shrink-0"
          />
        )}
      </div>
      {error && (
        <span
          data-ui={`${dataUiScope}.error`}
          data-testid={`${testId}-error`}
          className="text-[11px] text-[var(--accent-danger)]"
        >
          {error}
        </span>
      )}
    </div>
  )
}
