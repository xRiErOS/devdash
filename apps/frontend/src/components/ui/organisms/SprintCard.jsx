/**
 * SprintCard — Organism (Plan-Architektur Roadmap-Board 2026-06-08, REQ-40/T02).
 *
 * Domäne: SPRINT. Kompakte Karte für den Spaltenkörper des Roadmap-Boards:
 * Drag-Handle, Sprint-Key-Pill, Status-Badge, Name und Fortschritt
 * (erledigte vs. geplante Issues). Klick auf die Karte öffnet die
 * Sprint-Details-Seite (einheitlicher Drilldown, REQ-42).
 *
 * ABGRENZUNG zu SprintRow (Organism): SprintRow = einzeilige Listen-Zeile
 * (Swimlane-/Listen-Kontexte); SprintCard = mehrzeilige KARTE für
 * Spalten-Layouts (Roadmap-Board-Spaltenkörper).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/Router. Sprint kommt als
 * Prop; Interaktion via Callbacks (onOpen) bzw. dragHandleProps vom
 * DnD-Wrapper. Kein eigener State.
 *
 * TOKEN-CLEAN: 0 inline-style, 0 Raw-Hex.
 *
 * Optional aufklappbar (REQ-43, PO 2026-06-08): zeigt die Issues des Sprints als
 * kompakte, zu den Issue-Details verlinkte Zeilen. Der Expand-Zustand ist
 * controlled (`expanded` + `onToggleExpand`) ODER intern (`defaultExpanded`).
 *
 * ABGRENZUNG zu SprintRow (Organism): SprintRow = einzeilige Listen-Zeile
 * (Swimlane-/Listen-Kontexte); SprintCard = mehrzeilige KARTE für
 * Spalten-Layouts (Roadmap-Board-Spaltenkörper).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/Router. Sprint kommt als
 * Prop; Interaktion via Callbacks (onOpen) bzw. dragHandleProps vom
 * DnD-Wrapper.
 *
 * TOKEN-CLEAN: 0 inline-style, 0 Raw-Hex.
 *
 * @param {object} props
 * @param {object} props.sprint - { id, key, name, status, issue_done, issue_total }
 * @param {(id:(string|number)) => void} [props.onOpen] - Klick auf Karte (Sprint-Details öffnen)
 * @param {Array<object>} [props.issues=[]] - Issues des Sprints (id, title, type, status, project_prefix, project_number) für den Expand-Bereich.
 * @param {boolean} [props.expanded] - controlled Expand-Zustand; ohne diese Prop greift interner State.
 * @param {boolean} [props.defaultExpanded=false] - Start-Zustand bei internem State.
 * @param {() => void} [props.onToggleExpand] - controlled Toggle-Callback.
 * @param {(id:(string|number)) => void} [props.onOpenIssue] - Klick auf eine Issue-Zeile (Issue-Details öffnen).
 * @param {object} [props.dragHandleProps={}] - vom DnD-Wrapper durchgereichte Handle-Props
 * @param {boolean} [props.dragging=false] - visueller Drag-Zustand (Überlagerung/Schatten)
 * @param {string} [props.dataUiScope='sprint-card'] - parametrisierter data-ui-Wurzel-bereich (I03)
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import EntityPill from '../atoms/EntityPill.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import ProgressBar from '../atoms/ProgressBar.jsx'
import { TypeIcon } from '../atoms/typeIcons.jsx'
import { displayId } from '../../../lib/displayId.js'

export default function SprintCard({
  sprint,
  onOpen,
  issues = [],
  expanded,
  defaultExpanded = false,
  onToggleExpand,
  onOpenIssue,
  dragHandleProps = {},
  dragging = false,
  dataUiScope = 'sprint-card',
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultExpanded)
  const isControlled = expanded != null
  const open = isControlled ? expanded : internalOpen
  const toggle = () => (isControlled ? onToggleExpand?.() : setInternalOpen((v) => !v))

  const done = sprint.issue_done ?? 0
  const total = sprint.issue_total ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const dragState = dragging ? 'shadow-[var(--shadow-card)] opacity-90' : ''
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div
      data-ui={dataUiScope}
      className={`rounded-md border border-[var(--surface0)] bg-[var(--base)] p-2 ${dragState} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-ui={`${dataUiScope}.drag-handle`}
          {...dragHandleProps}
          aria-label="Sprint verschieben"
          title="Ziehen: Rang ändern oder Meilenstein zuordnen"
          className="shrink-0 cursor-grab touch-none text-[var(--subtext0)]"
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>
        <EntityPill
          id={sprint.key}
          showName={false}
          size="sm"
          color="info"
          data-ui={`${dataUiScope}.key`}
        />
        <StatusBadge
          status={sprint.status}
          className="ml-auto shrink-0"
          data-ui={`${dataUiScope}.status`}
        />
      </div>
      <button
        type="button"
        data-ui={`${dataUiScope}.open`}
        onClick={() => onOpen?.(sprint.id)}
        className="mt-1.5 block w-full text-left text-sm leading-snug text-[var(--text)] hover:underline"
        title={`${sprint.key} — ${sprint.name}`}
      >
        {sprint.name}
      </button>
      <div data-ui={`${dataUiScope}.progress`} className="mt-1.5 flex items-center gap-2">
        <ProgressBar
          percent={pct}
          size="xs"
          tone="success"
          label={`${done} von ${total} Issues erledigt`}
          className="flex-1"
        />
        <span className="shrink-0 font-mono text-[10px] text-[var(--subtext0)]">
          {done}/{total}
        </span>
      </div>
      <button
        type="button"
        data-ui={`${dataUiScope}.expand`}
        onClick={toggle}
        aria-expanded={open}
        className="mt-1.5 flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--subtext0)] hover:text-[var(--text)]"
      >
        <Chevron size={12} aria-hidden="true" />
        {open ? 'Issues ausblenden' : `Issues anzeigen (${issues.length})`}
      </button>
      {open && (
        <div data-ui={`${dataUiScope}.issues`} className="mt-1 flex flex-col gap-0.5">
          {issues.length === 0 ? (
            <span className="px-1 py-1 text-[11px] text-[var(--subtext0)]">Keine Issues im Sprint.</span>
          ) : (
            issues.map((it) => (
              <button
                key={it.id}
                type="button"
                data-ui={`${dataUiScope}.issues.row.${it.id}`}
                onClick={() => onOpenIssue?.(it.id)}
                className="flex items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-[var(--surface0)]"
                title={`${displayId(it)} — ${it.title}`}
              >
                <span className="w-[46px] shrink-0 font-mono text-[10px] text-[var(--subtext0)]">
                  {displayId(it)}
                </span>
                <TypeIcon type={it.type} size={12} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text)]">{it.title}</span>
                <StatusBadge status={it.status} className="shrink-0" data-ui={`${dataUiScope}.issues.row.${it.id}.status`} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
