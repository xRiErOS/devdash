/**
 * ListItemPreview — Push-Panel rechts der Liste (Spec §5). Zeigt den passenden
 * Detail-Organismus zum aktiven Element und reicht ihn direkt durch (Import, kein
 * Re-Build): Issue → `IssueDetails`, Sprint → `SprintDetails`, Milestone →
 * `MilestoneDetails`. Drag-Handle (4px) links signalisiert Resize.
 *
 * Resize ist im echten Screen frei (min 280px / max 60vw, localStorage); im
 * presentational Mockup sind die Breiten diskrete Stufen (`size`-Prop), damit die
 * Stories ohne Interaktivität die Zustände zeigen. `compact` (size==='compact',
 * < 360px) ist eine visuelle Näherung — die echte `compact`-Stack-Prop auf
 * DetailLayout ist ein Promote-Task (T02), src/ui bleibt hier unberührt (D04).
 *
 * Ultra-fast: das Panel ist `React.memo` + der Detail-Body memoisiert — ein
 * Tastendruck in der Liste (Roving-Fokus) re-rendert die Preview NICHT; sie
 * mountet synchron (keine Transition, kein Lazy-Load) und übernimmt beim Öffnen
 * den Fokus, sodass `Esc` sofort schließt (Feedback: schnell + Esc-schließbar).
 *
 * @param {object} props
 * @param {boolean} [props.open=false]
 * @param {'issue'|'sprint'|'milestone'} [props.type='issue']
 * @param {object} [props.data] - an den Detail-Organismus (issue/sprint/milestone)
 * @param {'compact'|'default'|'wide'} [props.size='default'] - Panel-Breitenstufe
 * @param {()=>void} [props.onClose]
 * @param {string} [props.dataUiScope='organism.listItemPreview']
 * @param {string} [props.className]
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import Icon from '../../foundations/Icon.jsx'
import IssueDetails from '../../screens/IssueDetails.jsx'
import SprintDetails from '../../screens/SprintDetails.jsx'
import MilestoneDetails from '../../screens/MilestoneDetails.jsx'

const WIDTH = { compact: 'w-[280px]', default: 'w-[420px]', wide: 'w-[60vw]' }
const TITLE = { issue: 'Issue', sprint: 'Sprint', milestone: 'Meilenstein' }

function DetailFor({ type, data, scope }) {
  if (type === 'sprint') return <SprintDetails sprint={data} dataUiScope={`${scope}.sprint`} />
  if (type === 'milestone') return <MilestoneDetails milestone={data} dataUiScope={`${scope}.milestone`} />
  return <IssueDetails issue={data} dataUiScope={`${scope}.issue`} />
}

function ListItemPreview({
  open = false, type = 'issue', data, size = 'default', onClose,
  dataUiScope = 'organism.listItemPreview', className = '',
}) {
  const asideRef = useRef(null)
  // Beim Öffnen Fokus ins Panel ziehen → Esc schließt ohne extra Klick.
  useEffect(() => { if (open) asideRef.current?.focus() }, [open, type, data])
  // Detail-Body nur neu bauen, wenn sich das Element wirklich ändert.
  const body = useMemo(
    () => <DetailFor type={type} data={data} scope={`${dataUiScope}.detail`} />,
    [type, data, dataUiScope],
  )

  if (!open) return null
  const compact = size === 'compact'
  const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.() } }

  return (
    <aside
      ref={asideRef}
      data-ui={dataUiScope}
      role="complementary"
      aria-label={TITLE[type] || 'Detail'}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`relative flex shrink-0 ${WIDTH[size] || WIDTH.default} max-w-[60vw] min-w-[280px] flex-col bg-[var(--base)] border-l border-[var(--border)] outline-none ${className}`}
    >
      {/* Drag-Handle (4px) — Resize-Affordanz, im Mockup nicht interaktiv */}
      <span data-ui={`${dataUiScope}.handle`} aria-hidden className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[var(--border-elevated)]" />

      <header data-ui={`${dataUiScope}.head`} className="flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border)]">
        <span className="[font-family:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--overlay1)]">
          {TITLE[type] || 'Detail'}
        </span>
        <button type="button" data-ui={`${dataUiScope}.close`} aria-label="Schließen (Esc)" onClick={onClose} className="inline-flex items-center justify-center size-6 rounded-sm hover:bg-[var(--state-hover)]">
          <Icon name="close" size={16} mono />
        </button>
      </header>

      <div data-ui={`${dataUiScope}.body`} className={`flex-1 overflow-y-auto p-[var(--space-4)] ${compact ? 'text-[12px]' : ''}`}>
        {body}
      </div>
    </aside>
  )
}

export default memo(ListItemPreview)
