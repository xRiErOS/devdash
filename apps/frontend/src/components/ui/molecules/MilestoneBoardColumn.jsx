import BoardColumn from './BoardColumn.jsx'
import DragHandle from '../atoms/DragHandle.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Pill from '../atoms/Pill.jsx'
import ProgressBar from '../atoms/ProgressBar.jsx'
import Stack from '../layout/Stack.jsx'

/**
 * MilestoneBoardColumn — Molekül (04.40 Data Display, GF-324). Die Milestone-Spalte
 * des RoadmapBoards: komponiert die Basis `BoardColumn` (filled) und füllt sie
 * milestone-spezifisch (D01/D02-Split, reduziert die Prop-Polymorphie):
 *  - **DragHandle** (D05) — Milestones sind umsortierbar (`reorderable`, Default an).
 *  - **Trailing** (D04) — `status` → `StatusBadge` (`.status`) ODER `count` → `Pill`
 *    (`.count`, z.B. „NICHT ZUGEORDNET"-Pseudo-Spalte).
 *  - **Subheader-Meta** (D06) — optional `description` + `target` (Ziel-Datum) +
 *    `progress` (ProgressBar) + `counts` (Sp·Iss). Liegt im subheader-Slot, NICHT im
 *    Header-Bar (Header bleibt lean).
 *
 * data-ui Parent-Scope (D01/D07): Consumer übergibt `roadmap-board.column-<id>`; das
 * Molekül leitet alle Sub-Anker ab (`.drag-handle`/.status`/.count`/.target`/
 * .progress`/.counts` + BoardColumn-eigene `.header`/.title`/.subheader`/.empty-hint`).
 *
 * Präsentational: Daten + Drag-Handler vom Consumer.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.name - Milestone-Titel.
 * @param {string} [props.status] - StatusBadge-Schlüssel (Trailing-Variante a).
 * @param {import('react').ReactNode} [props.count] - Count-Pill (Trailing-Variante b).
 * @param {number} [props.deferred] - optionale „N deferred"-Warning-Pill (Trailing).
 * @param {import('react').ReactNode} [props.description] - Subheader-Beschreibung.
 * @param {import('react').ReactNode} [props.target] - Ziel-Datum (als „Ziel <target>").
 * @param {{value:number,max?:number}} [props.progress] - Subheader-ProgressBar.
 * @param {import('react').ReactNode} [props.counts] - Sp·Iss-Counts (Subheader).
 * @param {boolean} [props.reorderable=true] - DragHandle einblenden (D05).
 * @param {boolean} [props.empty=false]
 * @param {import('react').ReactNode} [props.emptyHint='Keine Sprints.']
 * @param {import('react').ReactNode} [props.children] - Body (Sprint-Cards).
 * @param {string} [props['data-ui']='milestone-board-column'] - Parent-Scope.
 * @param {string} [props.className]
 */
export default function MilestoneBoardColumn({
  name,
  status,
  count,
  deferred,
  description,
  target,
  progress,
  counts,
  reorderable = true,
  empty = false,
  emptyHint = 'Keine Sprints.',
  children,
  'data-ui': scope = 'milestone-board-column',
  className = '',
  ...rest
}) {
  const hasMeta = description != null || target != null || progress != null || counts != null

  return (
    <BoardColumn
      data-ui={scope}
      surface="filled"
      title={name}
      className={className}
      leading={reorderable ? <DragHandle data-ui={`${scope}.drag-handle`} /> : undefined}
      headerEnd={
        <>
          {status ? <StatusBadge status={status} data-ui={`${scope}.status`} /> : null}
          {count != null ? (
            <Pill color="neutral" size="sm" data-ui={`${scope}.count`}>{count}</Pill>
          ) : null}
          {deferred ? (
            <Pill color="warning" size="sm" data-ui={`${scope}.deferred`}>{deferred} deferred</Pill>
          ) : null}
        </>
      }
      subheader={
        hasMeta ? (
          <Stack gap="xs">
            {description != null ? (
              <p data-ui={`${scope}.description`} className="line-clamp-2 text-xs text-[var(--subtext1)]">{description}</p>
            ) : null}
            {target != null ? (
              <span data-ui={`${scope}.target`} className="text-xs text-[var(--subtext0)]">Ziel {target}</span>
            ) : null}
            {progress != null ? (
              <ProgressBar value={progress.value} max={progress.max} data-ui={`${scope}.progress`} />
            ) : null}
            {counts != null ? (
              <span data-ui={`${scope}.counts`} className="text-xs text-[var(--subtext1)]">{counts}</span>
            ) : null}
          </Stack>
        ) : undefined
      }
      empty={empty}
      emptyHint={emptyHint}
      {...rest}
    >
      {children}
    </BoardColumn>
  )
}
