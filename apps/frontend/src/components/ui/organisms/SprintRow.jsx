/**
 * SprintRow — Organism (DD-481 Phase-3 Extract, I01).
 *
 * Kanonische, domänen-bewusste Sprint-Zeile. Vereinheitlicht die zwei zuvor
 * inline duplizierten Sprint-Zeilen:
 *   - der ehemalige Swimlane-Roadmap-Modus  (inline `SprintRow`,
 *     data-ui `milestones.sprint-row.*`; Modus mit DD-510 entfernt)
 *   - src/views/SprintDetail.jsx               (SprintPill + Name + StatusBadge
 *     + inline `ProgressBar`, data-ui `sprint-detail.row.*`)
 *
 * Komponiert die Atoms SprintPill + StatusBadge + ProgressBar. Kennt die Domäne
 * „Sprint" (liest sprint.name/status/key/goal, rechnet done/total → Prozent) →
 * Tier=Organism.
 *
 * PRESENTATIONAL (D-Phase3-01):
 *   - Gehobene Kopplung: KEIN useDraggable/DnD, KEIN Fetch, KEIN Store. Die
 *     Swimlane-Quelle bündelte die dnd-kit-Drag-Source (`useDraggable`,
 *     GripVertical-Handle) direkt in der Zeile — diese DnD-Verdrahtung gehört
 *     in den Screen-Wrapper (Phase 5) und ist hier ENTFERNT. Die Zeile bleibt
 *     ein reiner Klick-/Keyboard-Trigger.
 *   - Daten kommen als Props: `sprint` (Objekt), `doneCount`, `totalCount`.
 *   - Navigation als Callback: `onSelect(sprint.id)`.
 *   - Lokaler State: keiner nötig (rein präsentational).
 *
 * @param {object}   props
 * @param {object}   props.sprint        - Sprint-Objekt {id,name,status,goal,key,project_prefix,project_number,...}
 * @param {number}   [props.doneCount=0] - abgeschlossene Issues (überschreibt sprint.issue_done)
 * @param {number}   [props.totalCount=0]- Issues gesamt (überschreibt sprint.issue_total)
 * @param {function} [props.onSelect]    - (sprintId) => void; Klick/Enter/Space
 * @param {boolean}  [props.showChevron=true] - Chevron-Affordance rechts
 * @param {React.ReactNode} [props.leading] - optionaler Slot ganz links INNERHALB der Zeile
 *        (z.B. ein Drag-Handle — gehört in die Zeile, nicht in den Parent; setPointerCapture
 *        des Handles blockt so den Row-Klick nicht über die Zeilengrenze hinweg)
 * @param {React.ReactNode} [props.metric] - optionaler Slot, der den Default-Fortschrittsblock
 *        (done/total + einfarbige ProgressBar) ERSETZT. Z.B. eine SegmentBar für die
 *        3-stufige Issue-Status-Mischung (Milestone-Sprints). undefined ⇒ Default-Block.
 * @param {string}   [props.dataUiScope='sprint-row'] - I03/D01: parametrisierter Wurzel-bereich
 *        (Screen biegt ihn in Phase 5 auf z.B. 'milestones.sprint-row' / 'sprint-detail.row' um)
 * @param {string}   [props.className]
 */
import { ChevronRight } from 'lucide-react'
import EntityPill from '../atoms/EntityPill.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import ProgressBar from '../atoms/ProgressBar.jsx'

// Sprint-Key aus den Domänen-Feldern ableiten (analog SprintDetail). Wird als
// ID-String an das domänen-agnostische SprintPill-Atom gereicht.
function sprintKey(sprint) {
  if (sprint.key) return sprint.key
  if (sprint.project_prefix && sprint.project_number != null) {
    return `${sprint.project_prefix}#${sprint.project_number}`
  }
  return `#${sprint.id}`
}

export default function SprintRow({
  sprint,
  doneCount,
  totalCount,
  onSelect,
  showChevron = true,
  leading,
  metric,
  dataUiScope = 'sprint-row',
  className = '',
}) {
  const total = totalCount ?? sprint.issue_total ?? 0
  const done = doneCount ?? sprint.issue_done ?? 0
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const clickable = typeof onSelect === 'function'

  const handleSelect = () => { if (clickable) onSelect(sprint.id) }
  const handleKey = (e) => {
    if (!clickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(sprint.id)
    }
  }

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={handleKey}
      data-ui={dataUiScope}
      data-testid={`sprint-row-${sprint.id}`}
      className={`flex items-center gap-3 p-3 rounded-lg bg-[var(--base)] border border-transparent transition-colors duration-100 min-h-[44px] ${clickable ? 'cursor-pointer hover:border-[var(--surface1)]' : ''} ${className}`}
    >
      {leading}
      <div className="shrink-0">
        <EntityPill
          id={sprintKey(sprint)}
          name={sprint.name}
          showName={false}
          entity="sprint"
          size="sm"
          data-ui={`${dataUiScope}.pill`}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={sprint.status} data-ui={`${dataUiScope}.status`} />
          <span
            data-ui={`${dataUiScope}.name`}
            className="font-display text-[13px] font-bold text-[var(--text)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[420px]"
          >
            {sprint.name || '(unbenannt)'}
          </span>
        </div>
        {sprint.goal && (
          <span
            data-ui={`${dataUiScope}.goal`}
            className="text-xs text-[var(--subtext0)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[480px]"
          >
            {sprint.goal}
          </span>
        )}
        {metric !== undefined ? (
          metric
        ) : (
          <div
            data-ui={`${dataUiScope}.progress`}
            className="flex items-center gap-2 text-[11px] font-display text-[var(--hint)]"
          >
            <span data-ui={`${dataUiScope}.progress.count`}>{done} / {total}</span>
            <ProgressBar
              percent={pct}
              size="xs"
              track="surface0"
              tone="success"
              maxWidth="max-w-[120px]"
              className="flex-1"
              label={`${done} von ${total} Issues abgeschlossen`}
              data-ui={`${dataUiScope}.progress.bar`}
            />
            <span data-ui={`${dataUiScope}.progress.pct`}>{pct}%</span>
          </div>
        )}
      </div>
      {showChevron && (
        <ChevronRight size={14} className="text-[var(--overlay0)] shrink-0" />
      )}
    </div>
  )
}
