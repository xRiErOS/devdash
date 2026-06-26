/**
 * Breadcrumb — Pfad-Anzeige (devd2 / DD#49 / DD2-7) mit führendem Prompt-Zeichen.
 * Letztes Segment hervorgehoben; Segmente per `/` getrennt.
 *
 * Presentational, props-driven. Default-Segmente sind Display-Text; ein Segment
 * mit `kind` wird über das Atom `EntityId` eingefärbt (Issue/Sprint/Milestone).
 *
 * @param {object} props
 * @param {Array<{label: React.ReactNode, kind?: 'issue'|'sprint'|'milestone', last?: boolean}>} props.segments
 * @param {string} [props.dataUiScope='molecule.breadcrumb']
 * @param {string} [props.className]
 */
import EntityId from '../atoms/EntityId.jsx'

export default function Breadcrumb({ segments = [], dataUiScope = 'molecule.breadcrumb', className = '' }) {
  return (
    <nav data-ui={dataUiScope} aria-label="Breadcrumb" className={`flex items-center gap-1.5 ${className}`}>
      <span
        data-ui={`${dataUiScope}.prompt`}
        aria-hidden="true"
        className="text-[var(--accent-primary)] [font-family:var(--font-display)] font-bold"
      >
        ❯
      </span>
      <span className="[font-family:var(--font-display)] text-[13px] text-[var(--subtext0)]">
        {segments.map((seg, i) => (
          <span key={String(seg.label)}>
            {seg.kind ? (
              <EntityId kind={seg.kind} dataUiScope={`${dataUiScope}.seg-${seg.label}`}>{seg.label}</EntityId>
            ) : (
              <span data-ui={`${dataUiScope}.seg-${seg.label}`} className={seg.last ? 'text-[var(--text)]' : ''}>
                {seg.label}
              </span>
            )}
            {i < segments.length - 1 && <span className="text-[var(--overlay0)]"> / </span>}
          </span>
        ))}
      </span>
    </nav>
  )
}
