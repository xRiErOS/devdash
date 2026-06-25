import { ArrowRight, Plus, Trash, RotateCcw, X, Layers, Tag as TagIcon, Edit3, Activity } from 'lucide-react'
import Pill from '../atoms/Pill.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import WidgetBase from './WidgetBase.jsx'

/**
 * ActivityList — DD#61 Organism (harvest aus components/itemDetail/ActivityList.jsx).
 * Domänen-bewusst: rendert eine Issue-Audit-Timeline (status_change/create/delete/
 * restore/force_delete/sprint_assign/edit/tags_update) inkl. relativer Zeit und
 * Agent-Herkunfts-Pill. Kennt das Activity-/Audit-Vokabular → ORGANISM-Tier.
 *
 * PRESENTATIONAL — gehobene Kopplung (D-Phase3-01):
 * - ENTFERNT: `fetch(/api/backlog/:id/activity)` + useState(items)/useState(loading)
 *   + useEffect-Datenladen. Die Aktivitäten kommen jetzt als `activity`-Prop rein,
 *   der Lade-Zustand als `loading`-Prop. Kein Store, kein Fetch, kein API-Call.
 * - BEHALTEN: kein lokaler UI-State nötig (reine Render-Liste, kein Expand-Toggle).
 *
 * @param {object} props
 * @param {Array<{id:number|string, action:string, old_value?:string, new_value?:string,
 *   timestamp?:string, agent_id?:string}>} [props.activity=[]] - Audit-Einträge (extern geladen)
 * @param {boolean} [props.loading=false] - Lade-Zustand (extern gesteuert)
 * @param {import('react').ReactNode} [props.heading] - OPT-IN self-titled Header
 *   via WidgetBase-Shell (WidgetHeading: Dot + --heading-accent, kein //-Slash).
 *   Ungesetzt → headless (Back-Compat für Slot-getriebene Kompositionen wie
 *   SprintDetails/MilestoneDetails/MemoryDetails).
 * @param {string} [props.dataUiScope='activity-list'] - parametrisierter data-ui-Wurzelbereich (I03/D01)
 * @param {string} [props.className]
 */

// DD-35: Action-Mapping fuer Activity-Timeline.
const ACTIVITY_ICONS = {
  status_change: ArrowRight,
  create: Plus,
  delete: Trash,
  restore: RotateCcw,
  force_delete: X,
  sprint_assign: Layers,
  edit: Edit3,
  tags_update: TagIcon,
}

function formatActivity(entry) {
  if (entry.action === 'status_change') {
    return { Icon: ArrowRight, text: <>Status <span className="font-mono">{entry.old_value || '·'}</span> → <span className="font-mono">{entry.new_value || '·'}</span></> }
  }
  if (entry.action === 'create') return { Icon: Plus, text: 'Erstellt' }
  if (entry.action === 'delete') return { Icon: Trash, text: 'In Papierkorb verschoben' }
  if (entry.action === 'restore') return { Icon: RotateCcw, text: 'Wiederhergestellt' }
  if (entry.action === 'force_delete') return { Icon: X, text: 'Endgueltig geloescht' }
  if (entry.action === 'sprint_assign') return { Icon: Layers, text: <>Sprint <span className="font-mono">{entry.old_value || '·'}</span> → <span className="font-mono">{entry.new_value || '·'}</span></> }
  if (entry.action === 'edit') return { Icon: Edit3, text: 'Bearbeitet' }
  if (entry.action === 'tags_update') return { Icon: TagIcon, text: 'Tags geaendert' }
  return { Icon: ACTIVITY_ICONS[entry.action] || Edit3, text: entry.action }
}

function agentColor(agentId) {
  if (!agentId) return 'neutral'
  if (agentId.startsWith('archon')) return 'warning'
  if (agentId.startsWith('claude')) return 'info'
  if (agentId.includes('bulk')) return 'primary'
  return 'neutral'
}

export default function ActivityList({
  activity = [],
  loading = false,
  heading,
  dataUiScope = 'activity-list',
  className = '',
  ...rest
}) {
  // Body unverändert (loading / empty / Liste). `heading` ist OPT-IN: gesetzt →
  // self-titled WidgetBase-Shell (Layer-3-Fill + Border + Radius + Padding,
  // WidgetHeading-Zeile oben), OHNE Action (dieses Widget hat keinen Top-Trigger).
  // Ungesetzt → byte-identischer Headless-Output (kein Wrapper) für die
  // Slot-getriebenen Kompositionen (SprintDetails/MilestoneDetails/MemoryDetails).
  // `...rest` landet weiterhin am Body.
  let body
  if (loading) {
    body = (
      <p
        data-ui={`${dataUiScope}.loading`}
        className={`py-6 text-center text-sm text-[var(--hint)] ${className}`}
        {...rest}
      >
        Laden…
      </p>
    )
  } else if (activity.length === 0) {
    body = (
      <EmptyState
        data-ui={`${dataUiScope}.empty`}
        icon={<Activity size={20} strokeWidth={2} />}
        title="Noch keine Aktivität"
        size="sm"
        className={className}
        {...rest}
      />
    )
  } else {
    body = (
      <ol data-ui={dataUiScope} className={`px-1 ${className}`} {...rest}>
        {activity.map((a, i) => {
          const { Icon, text } = formatActivity(a)
          const isLast = i === activity.length - 1
          return (
            <li
              key={a.id}
              data-ui={`${dataUiScope}.item`}
              className={`flex items-start gap-3 py-2.5 text-sm ${isLast ? '' : 'border-b border-[var(--surface0)]'}`}
            >
              <span
                data-ui={`${dataUiScope}.item.icon`}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--surface0)] text-[var(--subtext0)]"
              >
                <Icon size={11} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div data-ui={`${dataUiScope}.item.text`} className="text-[var(--text)]">{text}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                  <span data-ui={`${dataUiScope}.item.time`} className="font-mono text-[var(--hint)]">
                    {a.timestamp ? new Date(a.timestamp.replace(' ', 'T') + 'Z').toLocaleString('de-DE') : ''}
                  </span>
                  {a.agent_id && (
                    <Pill variant="outline" color={agentColor(a.agent_id)} size="sm" data-ui={`${dataUiScope}.item.agent`}>
                      {a.agent_id}
                    </Pill>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    )
  }

  // Kein heading → Headless-Output byte-identisch zum Bestand (kein Wrapper).
  if (heading == null) return body

  // Mit heading → WidgetBase-Shell (Layer-3-Fill + --border + Radius + Padding,
  // self-titled WidgetHeading: Dot + --heading-accent, kein //-Slash), Body als
  // children. KEINE Top-Action (dieses Widget hat keinen Top-Trigger).
  return (
    <WidgetBase heading={heading} dataUi={dataUiScope}>
      {body}
    </WidgetBase>
  )
}
