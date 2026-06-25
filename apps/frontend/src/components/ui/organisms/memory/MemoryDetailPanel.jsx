import Badge from '../../atoms/Badge.jsx'
import WidgetBase from '../WidgetBase.jsx'
import SupersedeChain from './SupersedeChain.jsx'

/**
 * MemoryDetailPanel — Detail-Pane des MemoryBrowse-Screens (GF-433 T3, 06.15 Memory).
 * Zeigt eine Erinnerung: Header (anchor · category-Badge · pills[pinned/importance/stability] · summary),
 * dann WidgetBase-Sektionen (Layer-3-Surface, 6-Ebenen-Canon): Kontext · Metadaten · Beziehungen
 * (Supersede-Kette, D05) · Tags. Präsentational, read-only. data-ui: memory-browse.panel.
 */
const CATEGORY_BADGE = {
  architecture_decision: { label: 'Architektur-Entscheidung', tone: 'mauve' },
  convention: { label: 'Konvention', tone: 'blue' },
  external_constraint: { label: 'Externer Constraint', tone: 'peach' },
  bug_pattern: { label: 'Bug-Pattern', tone: 'red' },
  dead_end: { label: 'Dead-End', tone: 'yellow' },
  session_note: { label: 'Session-Note', tone: 'neutral' },
}
const IMPORTANCE = { 1: 'hoch', 2: 'normal', 3: 'niedrig' }

export default function MemoryDetailPanel({ memory = {}, onNavigate }) {
  const cat = CATEGORY_BADGE[memory.category] || CATEGORY_BADGE.session_note
  const rel = memory.relations || {}
  const hasTags = Boolean((memory.tags ?? '').trim())
  const hasRelations = Boolean(rel.supersededBy || (rel.supersedes && rel.supersedes.length > 0))
  return (
    <div data-ui="memory-browse.panel" className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div data-ui="memory-browse.panel.header" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {memory.anchor && <span className="font-mono text-sm text-[var(--accent-primary)]">{memory.anchor}</span>}
          <Badge tone={cat.tone} appearance="tint" size="sm">{cat.label}</Badge>
          {memory.pinned ? <Badge tone="yellow" appearance="tint" size="sm">angeheftet</Badge> : null}
          <Badge tone="neutral" appearance="tint" size="sm">Wichtigkeit: {IMPORTANCE[memory.importance] || '—'}</Badge>
          <Badge tone={memory.stability === 'stable' ? 'green' : 'neutral'} appearance="tint" size="sm">{memory.stability}</Badge>
        </div>
        <h2 className="[font-family:var(--font-display)] text-xl font-bold text-[var(--text)]">{memory.summary}</h2>
      </div>

      <WidgetBase heading="Kontext" dataUi="memory-browse.widget.context">
        <p data-ui="memory-browse.panel.content" className="whitespace-pre-wrap text-sm text-[var(--subtext1)]">{memory.content || '—'}</p>
      </WidgetBase>

      <WidgetBase heading="Metadaten" dataUi="memory-browse.widget.meta">
        <dl data-ui="memory-browse.panel.meta" className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-[var(--subtext0)]">
          {memory.source_type && (<><dt className="text-[var(--subtext1)]">Quelle</dt><dd className="font-mono">{memory.source_type}{memory.source_ref ? ` · ${memory.source_ref}` : ''}</dd></>)}
          {memory.created_at && (<><dt className="text-[var(--subtext1)]">Erstellt</dt><dd className="font-mono">{memory.created_at}</dd></>)}
          {memory.updated_at && (<><dt className="text-[var(--subtext1)]">Aktualisiert</dt><dd className="font-mono">{memory.updated_at}</dd></>)}
        </dl>
      </WidgetBase>

      {hasRelations && (
        <WidgetBase heading="Beziehungen" dataUi="memory-browse.widget.relations">
          <SupersedeChain supersededBy={rel.supersededBy} supersedes={rel.supersedes} onNavigate={onNavigate} />
        </WidgetBase>
      )}

      {hasTags && (
        <WidgetBase heading="Tags" dataUi="memory-browse.widget.tags">
          <div data-ui="memory-browse.panel.tags" className="flex flex-wrap gap-2">
            {memory.tags.trim().split(/\s+/).map((t) => (
              <Badge key={t} tone="neutral" appearance="tint" size="sm">{t}</Badge>
            ))}
          </div>
        </WidgetBase>
      )}
    </div>
  )
}
