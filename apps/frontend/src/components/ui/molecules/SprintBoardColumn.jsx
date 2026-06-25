import BoardColumn from './BoardColumn.jsx'
import Pill from '../atoms/Pill.jsx'

/**
 * SprintBoardColumn — Molekül (04.40 Data Display, GF-325). Die Status-Lane des
 * SprintBoards: komponiert die Basis `BoardColumn` (filled) mit schmaler Prop-Menge
 * (D01/D02-Split). Bewusst minimal gegenüber MilestoneBoardColumn:
 *  - **Count-Pill** (D04-Variante b) als Trailing — die Anzahl Issues der Lane.
 *  - **KEIN DragHandle** (D05) — Status-Lanes sind konsekutiv, nicht umsortierbar.
 *  - **KEIN Subheader** — Lanes tragen keine Ziel-/Progress-Meta.
 *  - optionaler **footer**-Slot (AssignDropZone als Drag-Ziel).
 *
 * data-ui Parent-Scope (D01): Consumer übergibt `sprint-board.lane-<key>`; das Molekül
 * leitet `.count` ab, BoardColumn `.header`/.title`/.empty-hint`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label - Lane-Titel (Status-Name).
 * @param {import('react').ReactNode} [props.count] - Count-Pill (Issue-Anzahl).
 * @param {import('react').ReactNode} [props.footer] - Footer-Slot (z.B. AssignDropZone).
 * @param {boolean} [props.empty=false]
 * @param {import('react').ReactNode} [props.emptyHint='Keine Issues.']
 * @param {import('react').ReactNode} [props.children] - Body (Issue-Cards).
 * @param {string} [props['data-ui']='sprint-board-column'] - Parent-Scope.
 * @param {string} [props.className]
 */
export default function SprintBoardColumn({
  label,
  count,
  footer,
  empty = false,
  emptyHint = 'Keine Issues.',
  children,
  'data-ui': scope = 'sprint-board-column',
  className = '',
  ...rest
}) {
  return (
    <BoardColumn
      data-ui={scope}
      surface="filled"
      title={label}
      className={className}
      headerEnd={
        count != null ? <Pill color="neutral" size="sm" data-ui={`${scope}.count`}>{count}</Pill> : null
      }
      footer={footer}
      empty={empty}
      emptyHint={emptyHint}
      {...rest}
    >
      {children}
    </BoardColumn>
  )
}
