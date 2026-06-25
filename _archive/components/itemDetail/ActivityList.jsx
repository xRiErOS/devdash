import { useState, useEffect } from 'react'
import { X, ArrowRight, Plus, Trash, RotateCcw, Layers, Tag as TagIcon, Edit3 } from 'lucide-react'
import Pill from '../ui/atoms/Pill.jsx'

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

export default function ActivityList({ id }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/backlog/${id}/activity?limit=200`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled) { setItems(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])
  if (loading) return <p className="text-sm py-6 text-center" style={{ color: 'var(--hint)' }}>Laden…</p>
  if (items.length === 0) return <p className="text-sm py-6 text-center" style={{ color: 'var(--hint)' }}>Noch keine Aktivität</p>
  return (
    <ol className="px-1">
      {items.map((a, i) => {
        const { Icon, text } = formatActivity(a)
        return (
          <li
            key={a.id}
            data-ui={`issue-detail.activity.item.${a.id}`}
            className="flex items-start gap-3 py-2.5 text-sm"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--surface0)' : 'none' }}
          >
            <span
              className="shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded"
              style={{ background: 'var(--surface0)', color: 'var(--subtext0)' }}
            >
              <Icon size={11} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div style={{ color: 'var(--text)' }}>{text}</div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                <span className="font-mono" style={{ color: 'var(--hint)' }}>
                  {a.timestamp ? new Date(a.timestamp.replace(' ', 'T') + 'Z').toLocaleString('de-DE') : ''}
                </span>
                {a.agent_id && (
                  <Pill variant="outline" color={agentColor(a.agent_id)} size="sm">
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

// DD-122: Status-Pills mit Hierarchie. Forward = primary (peach), Cancel = destructive (red),
// Backward (z.B. refined → new) = secondary (outline grau).
// DD-45 R01: Spiegelt die Lifecycle aus server/lib/lifecycle.js wider.
// `passed -> done` ist system-only (sprint complete) und kein UI-Button.
// `to_review -> passed/rejected` haengt am Review-Vertrag und wird ueber den
// Review-Tab abgewickelt — daher hier kein direkter Forward.
