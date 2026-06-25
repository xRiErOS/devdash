import { ArrowRight } from 'lucide-react'
import Button from '../atoms/Button.jsx'
import Stack from '../layout/Stack.jsx'
import WidgetBase from './WidgetBase.jsx'

/**
 * SprintReviewRollup — Organism (05.30 Widgets, GF-2 Q01). Kompakter Review-Rollup für
 * den Sprint-Detail: drei Metriken (offen / bestanden / abgelehnt) + Nav „Review öffnen".
 * Speist den `entity-detail.slot.review`-Slot der SprintDetails-Komposition.
 *
 * Präsentational/controlled (V2-Widget-Kette): kein Store/Fetch/useEffect. Die echten
 * Zahlen liefert ab Wave D der Completeness-Endpoint (D-L); bis dahin Fixtures (D-F).
 *
 * DSN-B01 (WCAG, PO 2026-06-21): die Metrik-ZAHL steht in `--text` (AA-sicher auf
 * Layer-3, beide Themes); der semantische TON lebt ausschließlich im Dot (Akzent als
 * `bg`, dekorativ/aria-hidden) — KEIN voll-getönter Text und KEIN tint-Background
 * (peach/yellow/teal failen Latte-AA als Textfarbe).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.heading] - Self-Title (WidgetBase → WidgetHeading,
 *   Dot + `--heading-accent`). Weggelassen → headless (Titel aus dem EntityDetail-Slot).
 * @param {{open?:number,passed?:number,rejected?:number}} [props.metrics] - Review-Zähler.
 * @param {()=>void} [props.onOpenReview] - Klick auf „Review öffnen".
 * @param {string} [props.openLabel='Review öffnen'] - Nav-Button-Label.
 * @param {boolean} [props.loading=false] - true → Skeleton (aria-busy) bis Wave-D-Metrik.
 * @param {string} [props.dataUiScope='sprint-review-rollup'] - data-ui-Wurzelbereich.
 * @param {string} [props.className]
 */

const METRICS = [
  { key: 'open', label: 'Offen', tone: 'info' },
  { key: 'passed', label: 'Bestanden', tone: 'success' },
  { key: 'rejected', label: 'Abgelehnt', tone: 'danger' },
]

// Statische Klassen-Map (JIT-sichtbar, kein String-Interpolation in arbitrary value).
const DOT = {
  info: 'bg-[var(--accent-info)]',
  success: 'bg-[var(--accent-success)]',
  danger: 'bg-[var(--accent-danger)]',
}

export default function SprintReviewRollup({
  heading,
  metrics: { open = 0, passed = 0, rejected = 0 } = {},
  onOpenReview,
  openLabel = 'Review öffnen',
  loading = false,
  dataUiScope = 'sprint-review-rollup',
  className = '',
}) {
  const values = { open, passed, rejected }

  return (
    <WidgetBase heading={heading} dataUi={dataUiScope} className={className}>
      <Stack gap="sm">
        <div
          data-ui={`${dataUiScope}.metrics`}
          aria-busy={loading || undefined}
          className="grid grid-cols-3 gap-2"
        >
          {METRICS.map((m) => (
            <div
              key={m.key}
              data-ui={`${dataUiScope}.metric-${m.key}`}
              className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] p-2"
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  data-ui={`${dataUiScope}.metric-${m.key}.dot`}
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[m.tone]}`}
                />
                <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--subtext0)]">
                  {m.label}
                </span>
              </span>
              {loading ? (
                <span
                  aria-hidden="true"
                  data-ui={`${dataUiScope}.metric-${m.key}.skeleton`}
                  className="h-6 w-8 rounded bg-[var(--surface1)]"
                />
              ) : (
                <span
                  data-ui={`${dataUiScope}.metric-${m.key}.value`}
                  className="text-2xl font-bold tabular-nums text-[var(--text)] [font-family:var(--font-display)]"
                >
                  {values[m.key]}
                </span>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          appearance="tint"
          size="sm"
          trailingIcon={<ArrowRight size={14} aria-hidden="true" />}
          onClick={onOpenReview}
          data-ui={`${dataUiScope}.open`}
        >
          {openLabel}
        </Button>
      </Stack>
    </WidgetBase>
  )
}
