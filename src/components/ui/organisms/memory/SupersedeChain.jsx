/**
 * SupersedeChain — Memory-exklusives Beziehungs-Widget (GF-433 T3 / D05, 06.15 Memory).
 * Zeigt die Supersede-Kette: `←superseded_by` (Abgelöst durch) + `→supersedes` (Löst ab).
 * Append-only-Modell (project_memories.superseded_by). Rendert NICHTS, wenn keine Relation existiert.
 * data-ui: memory-browse.panel.relations. Navigation klickbar (onNavigate optional).
 */
export default function SupersedeChain({ supersededBy = null, supersedes = [], onNavigate }) {
  if (!supersededBy && (!supersedes || supersedes.length === 0)) return null
  const navProps = (id) =>
    onNavigate
      ? { role: 'button', tabIndex: 0, onClick: () => onNavigate(id), className: 'text-[var(--accent-primary)] hover:underline' }
      : { className: 'text-[var(--accent-primary)]' }
  return (
    <div data-ui="memory-browse.panel.relations" className="flex flex-col gap-2 text-sm">
      {supersededBy && (
        <div className="text-[var(--subtext0)]">
          <span className="text-[var(--subtext1)]">Abgelöst durch: </span>
          <span {...navProps(supersededBy.id)}>{supersededBy.summary}</span>
        </div>
      )}
      {supersedes && supersedes.length > 0 && (
        <div className="text-[var(--subtext0)]">
          <span className="text-[var(--subtext1)]">Löst ab:</span>
          <ul className="ms-4 mt-1 list-disc">
            {supersedes.map((s) => (
              <li key={s.id}>
                <span {...navProps(s.id)}>{s.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
