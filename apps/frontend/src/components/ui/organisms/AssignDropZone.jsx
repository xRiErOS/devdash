import { Move } from 'lucide-react'
import DropZone from '../molecules/DropZone.jsx'

/**
 * AssignDropZone — Organism (05.40 Boards, OR-15, GF-261). Drag-Ziel zum Zuweisen
 * eines Issues an einen Sprint / eine Lane. Komponiert das **ML-19 DropZone**
 * (GF-276, I06) als Frame + over-Visual — kein eigenes Drag-Plumbing.
 *
 * Präsentational: das DropZone liefert den Rahmen + den (controlled) `active`-Zustand;
 * die eigentliche Issue-Payload-Verdrahtung (dataTransfer mit Issue-Key statt FileList)
 * wickelt der Consumer in der Realisierungsphase ab (`onActivate`/eigener onDrop am
 * Wrapper). Touch-Drag deferred (D09, Desktop-Fokus). OR-15 = keine gemined Cap
 * (präsentational, Ebene 6).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.label='Issue hierher ziehen'] - Frame-Text.
 * @param {import('react').ReactNode} [props.hint] - sekundärer Hinweis.
 * @param {boolean} [props.active] - erzwingt das over-Visual (controlled).
 * @param {boolean} [props.disabled=false]
 * @param {'ghost'|'filled'} [props.surface='ghost'] - Idle-Fläche (D03, an DropZone durchgereicht).
 * @param {()=>void} [props.onActivate] - Klick/Enter/Space (z.B. Zuweis-Dialog).
 * @param {string} [props.data-ui='assign-dropzone'] - Anker-Scope (D01); die innere Zone
 *        erhält `${scope}.zone`. In Boards z.B. `sprint-board.column-dropzone-<lane>`.
 * @param {string} [props.className]
 */
export default function AssignDropZone({
  label = 'Issue hierher ziehen',
  hint,
  active,
  disabled = false,
  surface = 'ghost',
  onActivate,
  'data-ui': dataUi = 'assign-dropzone',
  className = '',
  ...rest
}) {
  return (
    <div data-ui={dataUi} className={className} {...rest}>
      <DropZone
        data-ui={`${dataUi}.zone`}
        icon={<Move size={16} aria-hidden="true" />}
        label={label}
        hint={hint}
        active={active}
        disabled={disabled}
        surface={surface}
        onActivate={onActivate}
        ariaLabel={typeof label === 'string' ? label : 'Issue zuweisen'}
      />
    </div>
  )
}
