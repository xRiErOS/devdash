/**
 * MetaPanel — rechte Metadaten-/Aktions-Spalte. Zwei Modi, ein Bauteil:
 *
 *  1. rows-Modus (generisch): kompakte `MetaGrid` aus `rows` (Status, Priorität,
 *     Sprint, Typ …) — Shell-Metadaten eines aktiven Issues/Sprints.
 *  2. entity-Modus (board-kontextuell): zeigt die ausgewählte Entität (Sprint-
 *     Card ODER Meilenstein-Spalte) mit typisiertem Kopf, kind-spezifischen
 *     Detail-Rows und einem Transition-Widget, um den Status direkt zu wechseln —
 *     ohne die Detail-Page zu öffnen.
 *
 * Modus-Wahl: ist `entity` gesetzt → entity-Modus, sonst rows-Modus. Beide
 * ein-/ausklappbar über `collapsed` (→ schmaler Streifen mit Toggle).
 *
 * MOCKUP-Phase (Promote 1+2): presentational. Auswahl (`entity`), Collapse und
 * Status-Wechsel kommen/gehen als Props/Callbacks. Erlaubte Folge-Status aus dem
 * literalen `NEXT_STATUS`-Map (presentational Spiegel von
 * `apps/backend/src/lib/lifecycle.js`) — echte Validierung/Mutation = Phase 3 (PO).
 *
 * Komposition: `MetaGrid`, `EntityId`, `StatusDot`, `Chip`, `ProgressBar`,
 * `IconButton`. Token-sauber, `data-ui` je Element.
 *
 * @param {object} props
 * @param {{kind:'sprint'|'milestone', name:string, status:string, [k:string]:any}|null} [props.entity] - entity-Modus
 * @param {Array<{label:React.ReactNode,value:React.ReactNode}>} [props.rows=[]] - rows-Modus
 * @param {boolean} [props.collapsed=false]
 * @param {()=>void} [props.onToggleCollapse]
 * @param {(nextStatus:string)=>void} [props.onTransition] - entity-Modus: Klick auf Folge-Status-Chip
 * @param {()=>void} [props.onOpenDetail] - entity-Modus: Navigation zur Detail-Page (↗)
 * @param {string} [props.dataUiScope='organism.metaPanel']
 * @param {string} [props.className]
 */
import MetaGrid from '../../molecules/MetaGrid.jsx'
import IconButton from '../../atoms/IconButton.jsx'
import EntityId from '../../atoms/EntityId.jsx'
import StatusDot from '../../atoms/StatusDot.jsx'
import Chip from '../../atoms/Chip.jsx'
import ProgressBar from '../../atoms/ProgressBar.jsx'
import { statusLabel } from '../../foundations/statusTone.js'

// Erlaubte Folge-Status je Entitäts-Typ (presentational). Vorwärts + ein
// Rückschritt + Abbruch; Endzustände leer.
const NEXT_STATUS = {
  sprint: {
    planning: ['active', 'cancelled'],
    active: ['review', 'planning', 'cancelled'],
    review: ['completed', 'active'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
  },
  milestone: {
    planning: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  },
}

const KIND_HEAD = {
  sprint: { kind: 'sprint', label: 'Sprint' },
  milestone: { kind: 'milestone', label: 'Meilenstein' },
}

function idLabel(entity) {
  if (entity.kind === 'milestone') return `M${entity.id}`
  return entity.key || `#${entity.id}`
}

function detailRows(entity) {
  if (entity.kind === 'milestone') {
    return [
      { label: 'Status', value: <StatusDot status={entity.status} label={statusLabel(entity.status)} /> },
      { label: 'Sprints', value: entity.sprints?.length ?? 0 },
      { label: 'DoD', value: entity.dod_total ?? '—' },
      { label: 'Target', value: entity.target_date || '—' },
    ]
  }
  return [
    { label: 'Status', value: <StatusDot status={entity.status} label={statusLabel(entity.status)} /> },
    { label: 'Issues', value: `${entity.issue_done ?? 0}/${entity.issue_total ?? 0}` },
    { label: 'Target', value: entity.target_date || '—' },
    { label: 'Position', value: entity.position ?? '—' },
  ]
}

// Transition-Widget: aktueller Status (aktiver Chip) + erlaubte Folge-Status.
function TransitionWidget({ entity, onTransition, dataUiScope }) {
  const next = NEXT_STATUS[entity.kind]?.[entity.status] ?? []
  return (
    <div data-ui={dataUiScope} className="flex flex-col gap-[var(--space-2)]">
      <span data-ui={`${dataUiScope}.label`} className="[font-family:var(--font-display)] text-[11px] font-bold tracking-[0.02em] text-[var(--subtext0)]">
        Status ändern
      </span>
      <div data-ui={`${dataUiScope}.options`} className="flex flex-wrap items-center gap-[var(--space-1)]">
        <Chip active dataUiScope={`${dataUiScope}.current`} className="cursor-default">{statusLabel(entity.status)}</Chip>
        {next.length === 0 ? (
          <span data-ui={`${dataUiScope}.terminal`} className="text-[11px] italic text-[var(--subtext0)]">Endzustand</span>
        ) : (
          next.map((s) => (
            <Chip key={s} onClick={() => onTransition?.(s)} dataUiScope={`${dataUiScope}.to-${s}`}>→ {statusLabel(s)}</Chip>
          ))
        )}
      </div>
    </div>
  )
}

export default function MetaPanel({
  entity = null, rows = [], collapsed = false, onToggleCollapse, onTransition, onOpenDetail,
  dataUiScope = 'organism.metaPanel', className = '',
}) {
  if (collapsed) {
    return (
      <aside
        data-ui={dataUiScope}
        aria-label="MetaPanel (eingeklappt)"
        className={`w-10 shrink-0 flex flex-col items-center gap-[var(--space-3)] py-[var(--space-3)] border-l border-[var(--border)] bg-[var(--mantle)] ${className}`}
      >
        <IconButton iconName="chevron-left" label="Ausklappen" onClick={onToggleCollapse} dataUiScope={`${dataUiScope}.toggle`} />
        <span data-ui={`${dataUiScope}.label`} className="[writing-mode:vertical-rl] [font-family:var(--font-display)] text-[11px] tracking-[0.06em] text-[var(--subtext0)]">
          METADATEN
        </span>
      </aside>
    )
  }

  // entity-Modus
  if (entity) {
    const head = KIND_HEAD[entity.kind]
    return (
      <aside
        data-ui={dataUiScope}
        aria-label="MetaPanel"
        className={`w-80 shrink-0 flex flex-col gap-[var(--space-3)] p-[var(--space-3)] border-l border-[var(--border)] bg-[var(--mantle)] ${className}`}
      >
        <div data-ui={`${dataUiScope}.head`} className="flex items-center gap-[var(--space-2)]">
          <EntityId kind={head.kind} dataUiScope={`${dataUiScope}.id`} className="text-[12px]">{idLabel(entity)}</EntityId>
          <span data-ui={`${dataUiScope}.name`} className="min-w-0 flex-1 truncate [font-family:var(--font-display)] text-[13px] font-bold text-[var(--text)]" title={entity.name}>{entity.name}</span>
          <IconButton iconName="external" size="sm" label="Detail-Page öffnen" onClick={onOpenDetail} dataUiScope={`${dataUiScope}.open`} />
          {onToggleCollapse && (
            <IconButton iconName="chevron-right" size="sm" label="Einklappen" onClick={onToggleCollapse} dataUiScope={`${dataUiScope}.toggle`} />
          )}
        </div>
        <span data-ui={`${dataUiScope}.kind`} className="text-[11px] uppercase tracking-[0.06em] text-[var(--subtext0)]">{head.label}</span>
        <MetaGrid rows={detailRows(entity)} dataUiScope={`${dataUiScope}.meta`} />
        {entity.kind === 'sprint' && (entity.issue_total ?? 0) > 0 && (
          <ProgressBar value={entity.issue_done ?? 0} total={entity.issue_total ?? 0} showLabel label="Issues" dataUiScope={`${dataUiScope}.progress`} />
        )}
        <div data-ui={`${dataUiScope}.divider`} aria-hidden="true" className="h-px bg-[var(--border)]" />
        <TransitionWidget entity={entity} onTransition={onTransition} dataUiScope={`${dataUiScope}.transition`} />
      </aside>
    )
  }

  // rows-Modus (generisch) — Platzhalter bei leeren rows.
  return (
    <aside
      data-ui={dataUiScope}
      aria-label="MetaPanel"
      className={`w-80 shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--mantle)] ${className}`}
    >
      <div data-ui={`${dataUiScope}.head`} className="flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]">
        <span className="[font-family:var(--font-display)] text-[12px] font-bold text-[var(--text)]">Metadaten</span>
        {onToggleCollapse && (
          <IconButton iconName="chevron-right" size="sm" label="Einklappen" onClick={onToggleCollapse} dataUiScope={`${dataUiScope}.toggle`} />
        )}
      </div>
      <div data-ui={`${dataUiScope}.body`} className="p-[var(--space-3)]">
        {rows.length === 0 ? (
          <p data-ui={`${dataUiScope}.empty`} className="px-1 py-[var(--space-4)] text-center text-[12px] italic text-[var(--subtext0)]">
            Wähle eine Spalte oder Karte
          </p>
        ) : (
          <MetaGrid rows={rows} dataUiScope={`${dataUiScope}.grid`} />
        )}
      </div>
    </aside>
  )
}
