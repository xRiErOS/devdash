/**
 * SprintCard — Sprint als Card im RoadmapBoard. Zwei Varianten in EINER
 * Komponente (D04: eine Quelle, kein Drift):
 *
 *  - `active`    → EntityId + StatusDot + Name + ProgressBar + DragHandle.
 *                  Body klickbar (onOpen → Sprint-Detail); nur der Handle zieht.
 *                  Im Wide-Mode zusätzlich eine Detailzeile + ein Chevron, der
 *                  die Issue-Liste (`sprint.issues[]`) aufklappt.
 *  - `completed` → reduziert: kompakt, muted, einzeilig, KEIN Handle/ProgressBar
 *                  (implizit fertig). Read-only am Fuß der Spalte.
 *
 * Reines Organism-Bauteil (presentational). DnD-Props (`dragHandleProps`,
 * `dragRef`, `isDragging`) reicht der Container herein.
 *
 * @param {object} props
 * @param {{ id:number, key?:string, name:string, status:string, issue_done?:number, issue_total?:number, issue_cancelled?:number, issues?:Array }} props.sprint
 * @param {'active'|'completed'} [props.variant='active']
 * @param {boolean} [props.wide=false] - Wide-Mode: Detailzeile + Issue-Chevron
 * @param {object} [props.dragHandleProps]
 * @param {React.Ref} [props.dragRef]
 * @param {boolean} [props.grabbing=false]
 * @param {boolean} [props.isDragging=false] - Ghost-Optik während des Drags
 * @param {()=>void} [props.onOpen] - Klick auf den Body (Navigation)
 * @param {string} [props.dataUiScope='organism.sprintCard']
 * @param {string} [props.className]
 */
import { useState } from 'react'
import EntityId from '../../atoms/EntityId.jsx'
import StatusDot from '../../atoms/StatusDot.jsx'
import ProgressBar from '../../atoms/ProgressBar.jsx'
import DragHandle from '../../atoms/DragHandle.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import ListItem from '../../molecules/ListItem.jsx'
import { statusLabel } from '../../foundations/statusTone.js'

function IssueList({ issues, open, dataUiScope }) {
  if (!open || !issues.length) return null
  return (
    <div data-ui={dataUiScope} className="flex flex-col gap-[var(--space-1)] mt-[var(--space-1)]">
      {issues.map((it, i) => (
        <ListItem key={it.key || i} dataUiScope={`${dataUiScope}.item-${i}`} className="py-1">
          <EntityId kind="issue" dataUiScope={`${dataUiScope}.item-${i}.id`} className="shrink-0 text-[11px]">
            {it.key}
          </EntityId>
          <StatusDot status={it.status} label={statusLabel(it.status)} dataUiScope={`${dataUiScope}.item-${i}.status`} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--subtext1)]" title={it.title}>
            {it.title}
          </span>
        </ListItem>
      ))}
    </div>
  )
}

export default function SprintCard({
  sprint, variant = 'active', wide = false,
  dragHandleProps, dragRef, grabbing = false, isDragging = false,
  onOpen, dataUiScope = 'organism.sprintCard', className = '',
}) {
  const { id, key, name, status, issue_done = 0, issue_total = 0, issue_cancelled = 0, issues = [] } = sprint || {}
  const display = key || `#${id}`
  const [issuesOpen, setIssuesOpen] = useState(false)

  if (variant === 'completed') {
    return (
      <div
        data-ui={dataUiScope}
        role="article"
        aria-label={`Sprint ${display}: ${name} (abgeschlossen)`}
        className={`flex items-center gap-[var(--space-2)] py-1 px-2 rounded-md bg-[var(--mantle)] border border-[var(--surface0)] text-[var(--subtext0)] min-w-0 ${className}`}
      >
        <EntityId kind="sprint" dataUiScope={`${dataUiScope}.id`} className="shrink-0 text-[11px] opacity-70">
          {display}
        </EntityId>
        <span data-ui={`${dataUiScope}.name`} className="min-w-0 flex-1 truncate text-[12px]" title={name}>
          {name}
        </span>
      </div>
    )
  }

  return (
    <div
      data-ui={dataUiScope}
      role="article"
      aria-label={`Sprint ${display}: ${name}`}
      className={`flex flex-col gap-[var(--space-2)] p-[var(--space-2)] rounded-md bg-[var(--base)] border border-[var(--surface0)] hover:border-[var(--surface1)] ${isDragging ? 'opacity-60 shadow-[var(--shadow-pop)]' : 'shadow-[var(--shadow-card)]'} ${className}`}
    >
      <div data-ui={`${dataUiScope}.head`} className="flex items-center gap-[var(--space-1)] min-w-0">
        <DragHandle
          ref={dragRef}
          label={`Sprint ${name} verschieben`}
          grabbing={grabbing}
          dataUiScope={`${dataUiScope}.grip`}
          {...dragHandleProps}
        />
        <EntityId kind="sprint" dataUiScope={`${dataUiScope}.id`} className="shrink-0 text-[12px]">
          {display}
        </EntityId>
        <StatusDot status={status} label={statusLabel(status)} dataUiScope={`${dataUiScope}.status`} className="shrink-0 ml-auto" />
      </div>

      {/* Body klickbar → Navigation. Eigener Button, damit der Drag-Handle
          (oben) nicht mit der Klick-Zone kollidiert. */}
      <button
        type="button"
        data-ui={`${dataUiScope}.open`}
        onClick={onOpen}
        className="text-left min-w-0 [font-family:var(--font-display)] text-[13px] font-semibold text-[var(--text)] truncate hover:text-[var(--accent-info)]"
        title={name}
      >
        {name}
      </button>

      <ProgressBar
        value={issue_done}
        total={issue_total}
        showLabel
        label={`Fortschritt Sprint ${display}`}
        dataUiScope={`${dataUiScope}.progress`}
      />

      {wide && (
        <div data-ui={`${dataUiScope}.detail`} className="flex flex-col gap-[var(--space-1)] pt-[var(--space-1)] border-t border-[var(--surface0)]">
          <div data-ui={`${dataUiScope}.detail.summary`} className="flex items-center gap-[var(--space-1)] [font-family:var(--font-display)] text-[11px] text-[var(--subtext0)]">
            <IconButton
              iconName={issuesOpen ? 'chevron-down' : 'chevron-right'}
              label={issuesOpen ? `Issues von ${display} einklappen` : `Issues von ${display} aufklappen`}
              size="sm"
              on={issuesOpen}
              onClick={() => setIssuesOpen((v) => !v)}
              dataUiScope={`${dataUiScope}.detail.toggle`}
            />
            <span>Issues {issues.length}</span>
            {issue_cancelled > 0 && (
              <span data-ui={`${dataUiScope}.detail.cancelled`} className="ml-auto tabular-nums">{issue_cancelled} storniert</span>
            )}
          </div>
          <IssueList issues={issues} open={issuesOpen} dataUiScope={`${dataUiScope}.issues`} />
        </div>
      )}
    </div>
  )
}
