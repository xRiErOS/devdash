/**
 * HierarchyTrail — DD-481 Organism. Vertikale Einordnungs-Kette einer Entität in
 * ihre Hierarchie (von oben/Vorfahr nach unten/selbst), z.B. Milestone → Sprint
 * → dieses Issue. Jeder Vorfahr-Knoten ist klickbar (→ Navigation zur jeweiligen
 * Detail-Seite); der aktuelle Knoten (current) ist hervorgehoben und nicht
 * klickbar. Generisch über die Knoten-Art (milestone/sprint/issue) — sie steuert
 * nur Icon + Level-Label. Connector-Chevron zwischen den Knoten.
 *
 * PRESENTATIONAL: kein Store/Fetch. Navigation als Callback:
 *   onSelect(node) — der Konsument routet zur Ziel-Seite.
 *
 * @param {object} props
 * @param {Array<{id?:number|string, kind:'milestone'|'sprint'|'issue', name:string, label?:string, current?:boolean}>} [props.nodes=[]]
 *        - Knoten von Vorfahr (oben) zu selbst (unten); current markiert den eigenen
 * @param {(node:object)=>void} [props.onSelect] - Klick auf einen Vorfahr-Knoten
 * @param {string} [props.dataUiScope='hierarchy-trail'] - Wurzel-data-ui-bereich
 * @param {string} [props.className]
 */

import { ChevronDown, Flag, Layers, Hash } from 'lucide-react'

// Knoten-Art → Icon + Default-Level-Label. Statisch (JIT-sicher, kein Domänen-Store).
const KIND = {
  milestone: { label: 'Milestone', Icon: Flag },
  sprint: { label: 'Sprint', Icon: Layers },
  issue: { label: 'Issue', Icon: Hash },
}

function NodeBody({ node, meta }) {
  const { Icon } = meta
  return (
    <span className="flex items-center gap-2 min-w-0">
      <Icon size={14} aria-hidden="true" className="shrink-0 text-[var(--subtext0)]" />
      <span className="flex flex-col min-w-0 text-left">
        <span className="text-[10px] uppercase tracking-wide text-[var(--subtext0)]">{node.label || meta.label}</span>
        <span className="text-sm font-medium truncate text-[var(--text)]">{node.name}</span>
      </span>
    </span>
  )
}

export default function HierarchyTrail({
  nodes = [],
  onSelect,
  dataUiScope = 'hierarchy-trail',
  className = '',
}) {
  return (
    <ol data-ui={dataUiScope} className={`flex flex-col list-none m-0 p-0 ${className}`}>
      {nodes.map((node, i) => {
        const meta = KIND[node.kind] || KIND.issue
        const isCurrent = !!node.current
        const anchor = `${dataUiScope}.node.${node.id ?? node.kind}`
        return (
          <li key={node.id ?? i} className="flex flex-col items-stretch">
            {i > 0 && (
              <span aria-hidden="true" className="self-center py-0.5 text-[var(--surface2)]">
                <ChevronDown size={16} />
              </span>
            )}
            {isCurrent ? (
              <div
                data-ui={anchor}
                aria-current="true"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--surface0)]"
              >
                <NodeBody node={node} meta={meta} />
                <span className="shrink-0 text-[9px] uppercase tracking-wide font-bold text-[var(--accent-primary)]">
                  Aktuell
                </span>
              </div>
            ) : (
              <button
                type="button"
                data-ui={anchor}
                onClick={() => onSelect?.(node)}
                className="flex items-center w-full gap-2 px-3 py-2 rounded-lg border border-[var(--surface1)] bg-[var(--base)] cursor-pointer text-left hover:bg-[var(--surface0)] hover:border-[var(--surface2)] transition"
              >
                <NodeBody node={node} meta={meta} />
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
