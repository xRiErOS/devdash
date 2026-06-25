/**
 * ActionBar — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/itemDetail/ActionBar.jsx, Plan 04 T3).
 *
 * Domänen-bewusste Einheit: Issue-Status-Transition-Leiste des ItemDetail-
 * Command-Centers. Bietet forward/backward Lifecycle-Transitions, kontextuelle
 * Hinweise (to_review/passed), einen Stornieren-Trigger (canCancel) und das
 * Stornierungs-Begründungs-Formular. Komponiert das Cluster-Atom (Action-Row)
 * und das Button-Atom (Transition-Trigger via inline TransitionButton-
 * Komposition). Kennt die Issue-Lifecycle-Domäne → ORGANISM.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/Lifecycle-API.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle bekam Handler + State bereits aus ItemDetail injiziert (kein
 *    eigener Store-/Fetch-Zugriff). Verlustfrei übernommen: alle Mutationen
 *    laufen über den `onTransition(nextStatus)`-Callback — die Lifecycle-
 *    Transition selbst (API-Call, Validierung) führt der Konsument aus.
 *  - `status`, `canCancel`, `statusError`, `forwards`/`backwards`/`labels`
 *    (abgeleitet aus availableTransitions) sind reine Props.
 *  - `transitioning` (Mutation-In-Flight) und der Cancel-Form-State
 *    (`showCancelInput`, `cancelNotes`, `setCancelNotes`) bleiben gehobene
 *    Props (der Konsument hält den ephemeren Form-/Busy-Zustand).
 *
 * @param {object} props
 * @param {string[]} [props.forwards] - Status-Keys für Vorwärts-Transitions
 * @param {string[]} [props.backwards] - Status-Keys für Rückwärts-Transitions
 * @param {Record<string,string>} [props.labels] - Status-Key → Anzeige-Label
 * @param {string} [props.status] - aktueller Issue-Status (für kontextuelle Hinweise)
 * @param {boolean} [props.transitioning=false] - Transition in-flight → Trigger disabled
 * @param {(next:string)=>void} [props.onTransition] - Transition auslösen (next = Ziel-Status)
 * @param {boolean} [props.canCancel=false] - Stornieren-Trigger anzeigen
 * @param {string} [props.statusError] - Fehlertext (Lifecycle-Fehler) → rote Zeile
 * @param {boolean} [props.showCancelInput=false] - Stornierungs-Begründungs-Formular anzeigen
 * @param {string} [props.cancelNotes=''] - Wert des Begründungs-Textareas
 * @param {(value:string)=>void} [props.setCancelNotes] - Begründung ändern
 * @param {()=>void} [props.onCancelDismiss] - Cancel-Formular abbrechen
 * @param {()=>void} [props.onCancelConfirm] - Stornierung bestätigen
 * @param {string} [props.dataUiScope='action-bar'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import Cluster from '../layout/Cluster.jsx'
import Button from '../atoms/Button.jsx'

// Transition-Trigger als Button-Atom-Komposition (../atoms/Button.jsx).
// forward = pending-Akzent (peach, fett), backward = stiller Ghost-Button mit
// Rahmen. Die domänen-spezifische Optik der Quelle wird über className auf das
// Button-Atom gelegt (className gewinnt als letzte Tailwind-Klasse).
const TRANSITION_CLASS = {
  forward: 'rounded text-xs font-bold bg-[var(--peach)] text-[var(--on-accent)]',
  backward: 'rounded text-xs bg-transparent text-[var(--subtext0)] border border-[var(--surface2)]',
}

function TransitionButton({ direction, label, disabled, onClick, dataUi, testId }) {
  const isForward = direction === 'forward'
  return (
    <Button
      variant={isForward ? 'primary' : 'ghost'}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      data-ui={dataUi}
      data-testid={testId}
      className={TRANSITION_CLASS[direction]}
    >
      {isForward ? '→ ' : '← '}{label}
    </Button>
  )
}

export default function ActionBar({
  forwards = [],
  backwards = [],
  labels = {},
  status,
  transitioning = false,
  onTransition,
  canCancel = false,
  statusError,
  showCancelInput = false,
  cancelNotes = '',
  setCancelNotes,
  onCancelDismiss,
  onCancelConfirm,
  dataUiScope = 'action-bar',
}) {
  const confirmDisabled = !cancelNotes.trim() || transitioning

  return (
    <footer
      data-ui={dataUiScope}
      className="shrink-0 px-4 py-2 bg-[var(--crust)] border-t border-[var(--surface0)]"
    >
      <Cluster gap="sm">
        <span
          data-ui={`${dataUiScope}.label`}
          className="text-[10px] uppercase tracking-wider font-bold text-[var(--overlay0)]"
        >
          Transition
        </span>
        {forwards.map((toStatus) => (
          <TransitionButton
            key={toStatus}
            direction="forward"
            label={labels[toStatus]}
            disabled={transitioning}
            onClick={() => onTransition?.(toStatus)}
            dataUi={`${dataUiScope}.transition.forward.${toStatus}`}
            testId={`item-transition-${toStatus}`}
          />
        ))}
        {backwards.map((toStatus) => (
          <TransitionButton
            key={toStatus}
            direction="backward"
            label={labels[toStatus]}
            disabled={transitioning}
            onClick={() => onTransition?.(toStatus)}
            dataUi={`${dataUiScope}.transition.backward.${toStatus}`}
          />
        ))}
        {status === 'to_review' && (
          <span data-ui={`${dataUiScope}.hint`} className="text-[11px] text-[var(--subtext0)]">
            Review-Verdict ueber Reviews-Tab (passed/rejected).
          </span>
        )}
        {status === 'passed' && (
          <span data-ui={`${dataUiScope}.hint`} className="text-[11px] text-[var(--subtext0)]">
            `done` wird durch Sprint Complete gesetzt.
          </span>
        )}
        {canCancel && (
          <button
            type="button"
            data-testid="item-cancel"
            data-ui={`${dataUiScope}.transition.cancel`}
            onClick={() => onTransition?.('cancelled')}
            disabled={transitioning}
            className="ml-auto px-3 py-1.5 rounded text-xs bg-transparent text-[var(--red)] border border-[var(--red)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Stornieren
          </button>
        )}
        {statusError && (
          <span data-ui={`${dataUiScope}.error`} className="text-xs w-full text-[var(--red)]">
            {statusError}
          </span>
        )}
      </Cluster>
      {showCancelInput && (
        <div data-ui={`${dataUiScope}.cancel-form`} className="w-full mt-1 p-3 rounded-lg bg-[var(--base)]">
          <p className="text-sm font-medium mb-2 text-[var(--red)]">Stornierungsbegründung (Pflicht)</p>
          <textarea
            data-testid="item-cancel-notes"
            data-ui={`${dataUiScope}.cancel-form.notes`}
            value={cancelNotes}
            onChange={(e) => setCancelNotes?.(e.target.value)}
            className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y mb-2 min-h-20 text-base bg-[var(--surface0)] text-[var(--text)]"
            placeholder="Warum wird dieses Issue storniert?"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelDismiss}
              data-ui={`${dataUiScope}.cancel-form.dismiss`}
              className="px-3 py-2 rounded-lg text-sm min-h-10 bg-[var(--surface1)] text-[var(--text)]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              data-testid="item-cancel-confirm"
              data-ui={`${dataUiScope}.cancel-form.confirm`}
              onClick={onCancelConfirm}
              disabled={confirmDisabled}
              className="px-3 py-2 rounded-lg text-sm font-medium min-h-10 bg-[var(--accent-danger)] text-[var(--on-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stornieren
            </button>
          </div>
        </div>
      )}
    </footer>
  )
}
