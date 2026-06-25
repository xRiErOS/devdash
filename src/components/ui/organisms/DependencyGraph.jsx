/**
 * DependencyGraph — DD-481 Organism. Presentational Abhängigkeits-Diagramm:
 * Vorgänger-Spalte → zentrales Subjekt → Nachfolger-Spalte, je als klickbare
 * Node-Cards mit Connector-Pfeilen. Abstrahiert den verworfenen
 * MilestoneDependencyGraph auf drei gleichtypige Varianten (milestone/sprint/
 * issue) — Abhängigkeiten sind immer gleichtypig.
 *
 * REIN präsentational: kein fetch/Store/API. Navigation als Callback
 * `onSelect(node)`. Abgrenzung zum DependencyForm: DIESES Organism VISUALISIERT
 * (read/navigate, Klick öffnet die Ziel-Seite), das Form MUTIERT (add/remove).
 *
 * @param {object} props
 * @param {{id?:number, name:string}} props.current - zentrales Subjekt (hervorgehoben, nicht klickbar)
 * @param {Array<{id?:number, name:string}>} [props.predecessors=[]] - Vorgänger (linke Spalte)
 * @param {Array<{id?:number, name:string}>} [props.successors=[]] - Nachfolger (rechte Spalte)
 * @param {(node:object)=>void} [props.onSelect] - Klick/Enter auf eine Vorgänger-/Nachfolger-Node
 * @param {'milestone'|'sprint'|'issue'} [props.variant='milestone'] - Typ-Preset (Begriffe)
 * @param {string} [props.dataUiScope='dependency-graph'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { ChevronRight } from 'lucide-react'

const NODE_BASE =
  'grid place-items-center text-center px-3 py-2 rounded-lg border text-xs font-mono ' +
  'min-h-11 min-w-[72px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-100'

const NODE_CURRENT =
  'border-[color-mix(in_srgb,var(--accent-info)_55%,transparent)] ' +
  'bg-[color-mix(in_srgb,var(--accent-info)_16%,transparent)] text-[var(--accent-info)] font-bold'

const NODE_LINKED = 'border-[var(--surface1)] bg-[var(--surface0)] text-[var(--text)]'

const NODE_INTERACTIVE =
  'cursor-pointer hover:border-[var(--accent-info)] hover:bg-[var(--surface1)]'

const COLUMN = 'flex flex-col gap-2 justify-center min-w-0'
const EMPTY = 'grid place-items-center px-3 py-2 text-[11px] italic text-[var(--subtext0)] min-h-11'

function DepNode({ node, anchor, current = false, onSelect }) {
  const clickable = !current && typeof onSelect === 'function'
  const tone = current ? NODE_CURRENT : NODE_LINKED

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onSelect(node)}
        data-ui={anchor}
        title={node.name}
        className={`${NODE_BASE} ${tone} ${NODE_INTERACTIVE}`}
      >
        {node.name}
      </button>
    )
  }
  return (
    <div data-ui={anchor} aria-current={current ? 'step' : undefined} title={node.name} className={`${NODE_BASE} ${tone}`}>
      {node.name}
    </div>
  )
}

function Connector({ anchor }) {
  return (
    <div data-ui={anchor} aria-hidden className="flex items-center justify-center shrink-0 text-[var(--overlay0)]">
      <ChevronRight size={18} />
    </div>
  )
}

export default function DependencyGraph({
  current,
  predecessors = [],
  successors = [],
  onSelect,
  // eslint-disable-next-line no-unused-vars
  variant = 'milestone',
  dataUiScope = 'dependency-graph',
  className = '',
}) {
  if (!current) return null

  return (
    <div data-ui={dataUiScope} className={`flex items-stretch gap-2 ${className}`}>
      <div data-ui={`${dataUiScope}.predecessors`} className={`${COLUMN} flex-1`}>
        {predecessors.length === 0 ? (
          <span data-ui={`${dataUiScope}.predecessors.empty`} className={EMPTY}>
            Keine Vorgänger
          </span>
        ) : (
          predecessors.map((m) => (
            <DepNode
              key={m.id ?? m.name}
              node={m}
              anchor={`${dataUiScope}.predecessor.${m.id ?? m.name}`}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      <Connector anchor={`${dataUiScope}.connector.in`} />

      <div className={`${COLUMN} shrink-0`}>
        <DepNode node={current} anchor={`${dataUiScope}.current`} current />
      </div>

      <Connector anchor={`${dataUiScope}.connector.out`} />

      <div data-ui={`${dataUiScope}.successors`} className={`${COLUMN} flex-1`}>
        {successors.length === 0 ? (
          <span data-ui={`${dataUiScope}.successors.empty`} className={EMPTY}>
            Keine Nachfolger
          </span>
        ) : (
          successors.map((m) => (
            <DepNode
              key={m.id ?? m.name}
              node={m}
              anchor={`${dataUiScope}.successor.${m.id ?? m.name}`}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
