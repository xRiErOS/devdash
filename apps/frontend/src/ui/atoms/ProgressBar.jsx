/**
 * ProgressBar — dichotomer Fortschrittsbalken `value / total`.
 *
 * Erledigt = grün (`--accent-success`), Rest = neutrale Spur (`--surface1`).
 * Reines Display-Atom, props-driven. Im RoadmapBoard zeigt es je SprintCard
 * `issue_done / issue_total` (done+passed grün, cancelled exkludiert — Backend-
 * Semantik `/api/milestones`, PO-Entscheidung 2026-06-26).
 *
 * Edge: `total = 0` → leere neutrale Spur (kein NaN), z.B. Sprint ohne Issues
 * oder rein storniert.
 *
 * @param {object} props
 * @param {number} props.value - erledigte Einheiten (issue_done)
 * @param {number} props.total - Gesamt ohne cancelled (issue_total)
 * @param {boolean} [props.showLabel=false] - rechtsbündiges `done/total`-Label
 * @param {string} [props.label='Fortschritt'] - aria-label
 * @param {string} [props.dataUiScope='atom.progressBar']
 * @param {string} [props.className]
 */
export default function ProgressBar({
  value = 0, total = 0, showLabel = false, label = 'Fortschritt',
  dataUiScope = 'atom.progressBar', className = '',
}) {
  const safeTotal = Math.max(0, total)
  const safeValue = Math.max(0, Math.min(value, safeTotal))
  const pct = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0

  return (
    <div data-ui={dataUiScope} className={`flex items-center gap-[var(--space-2)] ${className}`}>
      <div
        data-ui={`${dataUiScope}.track`}
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={label}
        className="relative h-[6px] flex-1 min-w-0 overflow-hidden rounded-full bg-[var(--surface1)]"
      >
        {/* Dynamische Breite via CSS-Var (sanktioniertes Muster wie Sidebar/
            DebugOverlay) — kein roher style-Visual-Wert. */}
        <div
          data-ui={`${dataUiScope}.fill`}
          style={{ '--pb-pct': `${pct}%` }}
          className="absolute inset-y-0 left-0 w-[var(--pb-pct)] rounded-full bg-[var(--accent-success)] transition-[width] duration-[var(--duration-base)] ease-[var(--ease-standard)]"
        />
      </div>
      {showLabel && (
        <span
          data-ui={`${dataUiScope}.label`}
          className="shrink-0 [font-family:var(--font-display)] text-[11px] tabular-nums text-[var(--subtext0)]"
        >
          {safeValue}/{safeTotal}
        </span>
      )}
    </div>
  )
}
