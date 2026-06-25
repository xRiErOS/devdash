import Card from '../atoms/Card.jsx'

/**
 * BoardColumn — Basis-Molekül (04.40 Data Display, GF-322). Die wiederholbare
 * Board-Spalten-Hülle: full-bleed Header (Title-Bar + abgesetzter Subheader) + Body +
 * optionaler Footer + Empty-State. Dumme Basis für `MilestoneBoardColumn` +
 * `SprintBoardColumn` (D01/D02) — beseitigt das in RoadmapBoard/SprintBoard
 * duplizierte Inline-Column-Chrome (D03-Inline-Markup-Verbot).
 *
 * Header (PO-Review 2026-06-18):
 *  - **full-bleed**: der Header überspannt die ganze Spalte (Card `padding=none` +
 *    `overflow-hidden`), wirkt als Band — nicht inline. Body ist eigens gepolstert.
 *  - **Subheader ist Teil des Headers** (Header-Information), aber **farblich
 *    abgesetzt** von der Title-Bar, damit die Info-Hierarchie gewahrt bleibt:
 *    Title-Bar `surface1` (prominent) › Subheader `surface0` › Body `mantle`.
 *  - `surface`: `filled` (grau, Default — Screenshot-Look) | `ghost` (transparent +
 *    border-b unter der Title-Bar, GF-316).
 *
 * data-ui Parent-Scope (D01): der Consumer übergibt ein gescoptes `data-ui`
 * (`roadmap-board.column-<id>`, `sprint-board.lane-<key>`); das Molekül leitet
 * `${scope}.header`/`.title`/`.subheader`/`.body`/`.empty-hint` ab. Slot-Inhalte
 * tragen ihre eigenen Scope-Anker vom Consumer.
 *
 * Präsentational: kein State, kein Fetch.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title - Title-Bar-Label (uppercase via Molekül).
 * @param {import('react').ReactNode} [props.leading] - Slot links in der Title-Bar (DragHandle).
 * @param {import('react').ReactNode} [props.headerEnd] - Trailing-Slot rechts (StatusBadge/Count).
 * @param {import('react').ReactNode} [props.subheader] - Header-Meta (im Header, abgesetzt).
 * @param {'filled'|'ghost'} [props.surface='filled'] - Header-Fläche.
 * @param {boolean} [props.empty=false] - rendert `emptyHint` statt `children`.
 * @param {import('react').ReactNode} [props.emptyHint='Leer.'] - Hinweis im Empty-State.
 * @param {import('react').ReactNode} [props.footer] - Slot unter dem Body (z.B. AssignDropZone).
 * @param {import('react').ReactNode} [props.children] - Body (Item-Stack).
 * @param {string} [props['data-ui']='board-column'] - Parent-Scope (D01).
 * @param {string} [props.className]
 */
export default function BoardColumn({
  title,
  leading,
  headerEnd,
  subheader,
  surface = 'filled',
  empty = false,
  emptyHint = 'Leer.',
  footer,
  children,
  'data-ui': scope = 'board-column',
  className = '',
  ...rest
}) {
  // Title-Bar: filled = graue Fläche (surface1, prominent); ghost = transparent + border-b.
  const titleBar = surface === 'filled' ? 'bg-[var(--surface1)]' : 'border-b border-[var(--surface1)]'
  // Subheader: abgesetzt von der Title-Bar (surface0, eine Ebene heller) → Hierarchie.
  const subBar = surface === 'filled' ? 'bg-[var(--surface0)] border-t border-[var(--surface1)]' : ''

  return (
    <Card tone="mantle" padding="none" data-ui={scope} className={`overflow-hidden ${className}`} {...rest}>
      <header data-ui={`${scope}.header`}>
        <div className={`flex flex-wrap items-center gap-2 px-2 py-1.5 ${titleBar}`}>
          {leading}
          <span
            data-ui={`${scope}.title`}
            className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--subtext0)]"
          >
            {title}
          </span>
          {headerEnd}
        </div>
        {subheader ? (
          <div data-ui={`${scope}.subheader`} className={`px-2 py-1.5 ${subBar}`}>{subheader}</div>
        ) : null}
      </header>
      <div data-ui={`${scope}.body`} className="flex flex-col gap-2 px-2 py-2">
        {empty ? (
          <p data-ui={`${scope}.empty-hint`} className="text-xs text-[var(--subtext0)]">{emptyHint}</p>
        ) : (
          children
        )}
        {footer}
      </div>
    </Card>
  )
}
