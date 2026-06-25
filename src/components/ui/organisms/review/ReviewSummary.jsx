import Button from '../../atoms/Button.jsx'

/**
 * ReviewSummary — Runden-Zusammenfassung + Copy-Markdown (GF-2 T8, 06.80 Deps & Review).
 * `buildRoundMarkdown` rendert die Runde als kopierbares Markdown (✅/❌ je Issue + Feedback);
 * `allPassed` gatet den Complete-Marker. DD-186: `complete` ist nur ein Marker (KEIN
 * Sprint-Abschluss — der ist PO-exklusiv), disabled bis alle Issues passed.
 * data-ui: review-summary.copy / review-summary.complete.
 */
export function allPassed(issues) {
  return issues.every((i) => i.review_status === 'passed' || i.review_status === 'cancelled')
}

export function buildRoundMarkdown({ sprintKey, round, issues }) {
  const head = `# Review ${sprintKey} — Runde ${round}\n`
  const lines = issues.map((i) => {
    const ok = i.review_status === 'passed'
    const fb = i.comment ? ` — ${i.comment}` : ''
    return `- ${ok ? '✅' : '❌'} ${i.key} ${i.title}${fb}`
  })
  return `${head}\n${lines.join('\n')}\n`
}

export default function ReviewSummary({ sprintKey, round, issues = [], onComplete, showComplete = true, disabled = false }) {
  const passed = allPassed(issues)
  const total = issues.length
  const passedCount = issues.filter((i) => i.review_status === 'passed').length

  const handleCopy = () => {
    const md = buildRoundMarkdown({ sprintKey, round, issues })
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(md)
    }
  }

  return (
    <div data-ui="review-summary" className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--layer-3)] px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-[var(--text)]">
        <span className="font-medium">{sprintKey}</span>
        <span className="text-[var(--subtext0)]">Runde {round}</span>
        <span data-ui="review-summary.progress" className="tabular-nums text-[var(--subtext0)]">
          {passedCount}/{total} abgenommen
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button data-ui="review-summary.copy" variant="ghost" size="sm" disabled={disabled} onClick={handleCopy}>
          Als Markdown kopieren
        </Button>
        {showComplete && (
          <Button
            data-ui="review-summary.complete"
            variant="primary"
            size="sm"
            disabled={disabled || !passed}
            onClick={onComplete}
            title={passed ? undefined : 'Erst möglich, wenn alle Issues abgenommen sind.'}
          >
            Review abschließen
          </Button>
        )}
      </div>
    </div>
  )
}
