import Badge from '../../atoms/Badge.jsx'

/**
 * ReviewIssueRow — Master-Listen-Zeile des Review-Screens (GF-2 T5, 06.80 Deps & Review).
 * Zeigt ID/Title/Goal-Kurz + Verdict-Badge. Praesentational, controlled (selected/onSelect).
 * data-ui: review-issue-row (Row-Wrapper). Such-/Sort-Anker leben im Listen-Container
 * (ReviewFlow, T9), NICHT in der Row.
 *
 * Verdict-Taxonomie (Runden-Projektion, T1 Backend-Q01): pending/open = offen;
 * rejected/planned/not_passed = zurueckgeworfen; passed = abgenommen.
 */
const VERDICT_BADGE = {
  pending: { label: 'Offen', tone: 'neutral' },
  open: { label: 'Offen', tone: 'neutral' },
  rejected: { label: 'Abgelehnt', tone: 'red' },
  planned: { label: 'Abgelehnt', tone: 'red' },
  not_passed: { label: 'Abgelehnt', tone: 'red' },
  passed: { label: 'Abgenommen', tone: 'green' },
}

export default function ReviewIssueRow({ issue, selected = false, onSelect }) {
  const v = VERDICT_BADGE[issue.review_status] || VERDICT_BADGE.pending
  const select = onSelect ? () => onSelect(issue.key) : undefined
  const handleKeyDown = select
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          select()
        }
      }
    : undefined
  // Klickbare Row als role="button"-div (Bestands-Pattern IssueCard) — devd-tiers verbietet
  // rohes <button> in hoeheren Tiers; Verdict-Badge ist ein Atom-Kind, kein Primitiv.
  return (
    <div
      role="button"
      tabIndex={0}
      data-ui="review-issue-row"
      aria-pressed={selected}
      onClick={select}
      onKeyDown={handleKeyDown}
      className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left transition-colors ${
        selected ? 'bg-[var(--layer-4)]' : 'bg-transparent hover:bg-[var(--state-hover)]'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span data-ui="review-issue-row.key" className="font-mono text-xs text-[var(--subtext0)]">{issue.key}</span>
          <span data-ui="review-issue-row.title" className="truncate text-sm font-medium text-[var(--text)]">{issue.title}</span>
        </div>
        {issue.goal && (
          <p className="mt-0.5 truncate text-xs text-[var(--subtext0)]">{issue.goal}</p>
        )}
      </div>
      <Badge data-ui="review-issue-row.verdict" tone={v.tone} appearance="tint" size="sm">{v.label}</Badge>
    </div>
  )
}
