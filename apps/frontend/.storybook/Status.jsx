import { useOf } from '@storybook/addon-docs/blocks'

/**
 * Status — Docs-Block, der den Status EINER Story aus deren `meta.tags` rendert
 * (Single-Source, docs.mdx-Norm D03). Nicht hand-tippen — folgt automatisch den Tags.
 *
 * Liest `status:` · `qa_checklist:` · `qa_behavioral:` · `design_version:` aus den
 * aufgelösten Story-Tags und zeigt sie als token-saubere Badges. Unbekannte/fehlende
 * Felder werden ausgelassen.
 *
 * @param {object} props
 * @param {object} props.of - Story-Referenz (z.B. `Stories.Default`/`Stories.Draft`).
 */
const TONE = {
  'status:stable': 'text-[var(--accent-success)] border-[var(--accent-success)]',
  'status:review': 'text-[var(--accent-warning)] border-[var(--accent-warning)]',
  'status:open': 'text-[var(--subtext0)] border-[var(--overlay0)]',
  'status:archive': 'text-[var(--overlay0)] border-[var(--overlay0)]',
}

function Badge({ label, tone }) {
  return (
    <span
      data-ui={`status.badge.${label}`}
      className={`inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-mono ${tone || 'text-[var(--subtext0)] border-[var(--overlay0)]'}`}
    >
      {label}
    </span>
  )
}

export function Status({ of }) {
  let tags = []
  try {
    const resolved = useOf(of, ['story'])
    tags = resolved?.story?.tags || []
  } catch {
    tags = []
  }
  const known = tags.filter((t) =>
    /^(status|qa_checklist|qa_behavioral|design_version):/.test(t),
  )
  if (!known.length) {
    return <p data-ui="status.empty" className="text-sm text-[var(--subtext0)]">Keine Status-Tags an der Story.</p>
  }
  // status zuerst, Rest in stabiler Reihenfolge.
  const order = ['status', 'qa_checklist', 'qa_behavioral', 'design_version']
  known.sort((a, b) => order.indexOf(a.split(':')[0]) - order.indexOf(b.split(':')[0]))
  return (
    <div data-ui="status" className="flex flex-wrap items-center gap-2">
      {known.map((t) => <Badge key={t} label={t} tone={TONE[t]} />)}
    </div>
  )
}
