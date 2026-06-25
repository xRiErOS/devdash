import { useState } from 'react'
import { Pencil, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react'
import EntityPill from '../atoms/EntityPill.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Button from '../atoms/Button.jsx'
import Tooltip from '../atoms/Tooltip.jsx'
import ProgressBar from '../atoms/ProgressBar.jsx'

/**
 * SprintHeader — Organism (extract aus components/sprintBoard/primitives.jsx → SprintHeader).
 * Sprint-Metadaten-Zeile (Toolbar mit Lifecycle-/Reorder-/Review-Aktionen) plus Titel,
 * Status-Zeile und Kapazitätsbalken. Domänen-bewusst (kennt einen Sprint).
 *
 * Komponiert: SprintPill (Sprint-Key), MilestonePill (Atom), StatusBadge, IconButton/Tooltip
 * (Toolbar-Aktionen), Button (Archon-Trigger), ProgressBar(capacity) für die Auslastung.
 *
 * GEHOBENE KOPPLUNG (presentational, D-Phase3-01):
 * - `useParams()`-slug (react-router) ENTFERNT → Review-Link kommt als `reviewHref` rein
 *   (Screen baut den slug-gescopeten Pfad), Klick-Mutation via `onReview`-Callback optional.
 * - `useEffect`-Polling `GET /api/sprints/:id/active-run` ENTFERNT → `activeRunId` ist Prop.
 * - `fetch POST /api/sprints/:id/run-archon` ENTFERNT → `onRunArchon(sprint)`-Callback; der
 *   Screen führt die Mutation aus und reicht ein neues `activeRunId` als Prop zurück.
 * - `SprintActions` (API-gekoppelt) und `ArchonLogPanel` (fetch/WS) NICHT importiert →
 *   als `actionsSlot` / `archonLogSlot` Render-Slots reingereicht (bleiben Screen-Sache).
 * - `sprintKey()` / `displayId`-Helper raus aus der Library → `sprintId`/`milestoneLabel`
 *   als fertige String-Props (Screen formatiert).
 * Lokaler EPHEMERER UI-State (archonRunning beim optimistischen Trigger) BLEIBT.
 *
 * @param {object} props
 * @param {object} props.sprint - Sprint-Datensatz (status, name, goal/notes, capacity,
 *   item_count, terminal_count/done_count, milestone_id, wip_limit, _itemCount, _inProgressCount).
 * @param {string} props.sprintId - vorformatierter Sprint-Key (z.B. "DD#34").
 * @param {string} [props.milestoneLabel] - vorformatiertes Milestone-Label (z.B. "M1"); rendert
 *   die MilestonePill nur bei vorhandener `sprint.milestone_id`.
 * @param {string} [props.milestoneTitle] - Tooltip/Klartextname der Milestone.
 * @param {number} [props.activeRunId] - aktive Archon-Run-ID (vom Screen gepollt/durchgereicht).
 * @param {boolean} [props.archonEnabled=false] - blendet den Archon-Trigger + Log-Slot ein.
 * @param {string} [props.reviewHref] - Ziel-Pfad des Review-Links (slug-gescopet vom Screen).
 * @param {(sprint:object) => void} [props.onEdit]
 * @param {(sprint:object) => void} [props.onDelete] - kein Delete-Button wenn nicht gesetzt.
 * @param {(sprintId:number, dir:'up'|'down') => void} [props.onReorder]
 * @param {(sprint:object) => (void|Promise<void>)} [props.onRunArchon] - startet den Archon-Run.
 * @param {(milestoneId:number) => void} [props.onOpenMilestone]
 * @param {React.ReactNode} [props.actionsSlot] - Render-Slot für die SprintActions-Lifecycle-Buttons.
 * @param {React.ReactNode} [props.archonLogSlot] - Render-Slot für das ArchonLogPanel.
 * @param {string} [props.dataUiScope='sprint-header'] - parametrisierter data-ui-Wurzelbereich (I03/D01).
 * @param {string} [props.className]
 */
export default function SprintHeader({
  sprint,
  sprintId,
  milestoneLabel,
  milestoneTitle,
  activeRunId = null,
  archonEnabled = false,
  reviewHref,
  onEdit,
  onDelete,
  onReorder,
  onRunArchon,
  onOpenMilestone,
  actionsSlot,
  archonLogSlot,
  dataUiScope = 'sprint-header',
  className = '',
}) {
  const [archonRunning, setArchonRunning] = useState(false)

  const handleRunArchon = async () => {
    setArchonRunning(true)
    try {
      await onRunArchon?.(sprint)
    } finally {
      setArchonRunning(false)
    }
  }

  const itemCount = sprint._itemCount || 0
  const capacityPct = sprint.capacity
    ? Math.min(100, Math.round((itemCount / sprint.capacity) * 100))
    : null

  // DD-187: review-Sprints werden visuell wie active hervorgehoben.
  const isActive = sprint.status === 'active' || sprint.status === 'review'

  // StatusBadge-Mapping wie in der Quelle (active→in_progress, planning→new).
  const badgeStatus =
    sprint.status === 'active' ? 'in_progress' : sprint.status === 'planning' ? 'new' : sprint.status

  return (
    <div data-ui={dataUiScope} className={`mb-3 ${className}`}>
      {/* DD-166 R2: Lifecycle-/Reorder-/Review-Aktionen als Button-Group rechts. */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          {actionsSlot}
          <Tooltip label="Sprint bearbeiten">
            <IconButton
              icon={<Pencil size={13} />}
              label="Sprint bearbeiten"
              size="sm"
              onClick={() => onEdit?.(sprint)}
              data-ui={`${dataUiScope}.edit`}
            />
          </Tooltip>
          {onDelete && (
            <Tooltip label="Sprint löschen">
              <IconButton
                icon={<Trash2 size={13} />}
                label="Sprint löschen"
                size="sm"
                variant="danger"
                onClick={() => onDelete(sprint)}
                data-ui={`${dataUiScope}.delete`}
              />
            </Tooltip>
          )}
          <Tooltip label="Nach links schieben">
            <IconButton
              icon={<ChevronLeft size={14} />}
              label="Nach links schieben"
              size="sm"
              onClick={() => onReorder?.(sprint.id, 'up')}
              data-ui={`${dataUiScope}.move-left`}
            />
          </Tooltip>
          <Tooltip label="Nach rechts schieben">
            <IconButton
              icon={<ChevronRight size={14} />}
              label="Nach rechts schieben"
              size="sm"
              onClick={() => onReorder?.(sprint.id, 'down')}
              data-ui={`${dataUiScope}.move-right`}
            />
          </Tooltip>
          {sprint.status !== 'cancelled' && reviewHref && (
            <Tooltip label="Zur Review-Seite">
              <a
                href={reviewHref}
                data-ui={`${dataUiScope}.review`}
                className="w-7 h-7 rounded flex items-center justify-center bg-[var(--surface1)] text-[var(--subtext0)] no-underline hover:opacity-80"
                aria-label="Zur Review-Seite"
              >
                <Eye size={14} />
              </a>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Titel + Beschreibung UNTER der Button-Group */}
      <div className="min-w-0 mb-1">
        <h3
          className={`font-bold font-display leading-snug flex items-center gap-1.5 flex-wrap ${isActive ? 'text-base' : 'text-sm'}`}
          data-testid="sprint-card-title"
        >
          <EntityPill
            id={sprintId}
            entity="sprint"
            showName={false}
            data-ui={`${dataUiScope}.sprint-id`}
            data-testid="sprint-key"
            className="shrink-0"
          />
          {sprint.milestone_id != null && (
            <EntityPill
              id={milestoneLabel}
              entity="milestone"
              title={milestoneTitle}
              data-ui={`${dataUiScope}.milestone`}
              data-testid="sprint-milestone-pill"
              onClick={onOpenMilestone ? () => onOpenMilestone(sprint.milestone_id) : undefined}
            />
          )}
          {sprint.name && (
            <span
              data-ui={`${dataUiScope}.sprint-title`}
              className="min-w-0 break-words font-normal text-[var(--subtext1)]"
            >
              {' — '}
              {sprint.name}
            </span>
          )}
        </h3>
        {sprint.goal || sprint.notes ? (
          <p
            data-ui={`${dataUiScope}.sprint-goal`}
            className="text-xs mt-1 line-clamp-2 text-[var(--subtext1)]"
          >
            {sprint.goal || sprint.notes}
          </p>
        ) : (
          <p className="text-xs mt-1 italic text-[var(--subtext0)]">Kein Sprint-Ziel hinterlegt</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StatusBadge status={badgeStatus} data-ui={`${dataUiScope}.status`} />
          <span className="text-xs text-[var(--subtext0)]">
            {sprint.terminal_count ?? sprint.done_count ?? 0}/{sprint.item_count || 0}
            {sprint.capacity ? ` (cap: ${sprint.capacity})` : ''}
          </span>
          {/* DD-41: WIP-Anzeige. */}
          {sprint.wip_limit != null &&
            (() => {
              const wipNow = sprint._inProgressCount ?? 0
              const exceeded = wipNow >= sprint.wip_limit
              return (
                <span
                  data-ui={`${dataUiScope}.wip`}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    exceeded
                      ? 'bg-[var(--accent-danger)] text-[var(--on-accent)]'
                      : 'bg-[var(--surface1)] text-[var(--subtext0)]'
                  }`}
                  title={
                    exceeded
                      ? `WIP-Limit erreicht (${wipNow}/${sprint.wip_limit})`
                      : `Work in Progress: ${wipNow}/${sprint.wip_limit}`
                  }
                >
                  WIP {wipNow}/{sprint.wip_limit}
                </span>
              )
            })()}
        </div>
      </div>

      {capacityPct !== null && (
        <ProgressBar
          percent={capacityPct}
          capacity
          size="sm"
          track="surface1"
          className="mb-1.5"
          label={`Auslastung ${capacityPct}%`}
          data-ui={`${dataUiScope}.capacity`}
        />
      )}

      <div className="flex gap-1.5 flex-wrap">
        {archonEnabled && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunArchon}
            loading={archonRunning}
            data-ui={`${dataUiScope}.run-archon`}
            title="Archon-Workflow starten"
            className="bg-[var(--mauve)] text-[var(--on-accent)]"
          >
            {archonRunning ? '...' : 'Archon'}
          </Button>
        )}
      </div>
      {archonEnabled && activeRunId && archonLogSlot && (
        <div data-ui={`${dataUiScope}.archon-log`} className="mt-2">
          {archonLogSlot}
        </div>
      )}
    </div>
  )
}
