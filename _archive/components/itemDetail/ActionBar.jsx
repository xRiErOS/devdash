import { Cluster } from '../ui/layout/index.js'

// Plan 04 T3: ActionBar-Organism — Status-Transitions (forward/backward) + Cancel-
// Notes-Flow, aus dem ItemDetail-Command-Center herausgeloest. Verhalten 1:1; die
// Footer-Action-Row laeuft jetzt auf dem Cluster-Primitive. Handler + State bleiben
// in ItemDetail und kommen als Props rein (kein eigener State hier).
export default function ActionBar({
  forwards,
  backwards,
  labels,
  status,
  transitioning,
  onTransition,
  canCancel,
  statusError,
  showCancelInput,
  cancelNotes,
  setCancelNotes,
  onCancelDismiss,
  onCancelConfirm,
}) {
  return (
    <footer className="shrink-0 px-4 py-2" style={{ background: 'var(--crust)', borderTop: '1px solid var(--surface0)' }}>
      <Cluster gap="sm">
        <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--overlay0)' }}>Transition</span>
        {forwards.map(toStatus => (
          <button key={toStatus} data-testid={`item-transition-${toStatus}`} data-ui={`issue-detail.transition.forward.${toStatus}`} onClick={() => onTransition(toStatus)} disabled={transitioning} className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'var(--peach)', color: 'var(--on-accent)', opacity: transitioning ? 0.6 : 1 }}>
            → {labels[toStatus]}
          </button>
        ))}
        {backwards.map(toStatus => (
          <button key={toStatus} data-ui={`issue-detail.transition.backward.${toStatus}`} onClick={() => onTransition(toStatus)} disabled={transitioning} className="px-3 py-1.5 rounded text-xs" style={{ background: 'transparent', color: 'var(--subtext0)', border: '1px solid var(--surface2)', opacity: transitioning ? 0.6 : 1 }}>
            ← {labels[toStatus]}
          </button>
        ))}
        {status === 'to_review' && (
          <span className="text-[11px]" style={{ color: 'var(--subtext0)' }}>
            Review-Verdict ueber Reviews-Tab (passed/rejected).
          </span>
        )}
        {status === 'passed' && (
          <span className="text-[11px]" style={{ color: 'var(--subtext0)' }}>
            `done` wird durch Sprint Complete gesetzt.
          </span>
        )}
        {canCancel && (
          <button data-testid="item-cancel" data-ui="issue-detail.transition.cancel" onClick={() => onTransition('cancelled')} disabled={transitioning} className="ml-auto px-3 py-1.5 rounded text-xs" style={{ background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', opacity: transitioning ? 0.6 : 1 }}>
            Stornieren
          </button>
        )}
        {statusError && <span className="text-xs w-full" style={{ color: 'var(--red)' }}>{statusError}</span>}
      </Cluster>
      {showCancelInput && (
        <div className="w-full mt-1 p-3 rounded-lg" style={{ background: 'var(--base)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--red)' }}>Stornierungsbegründung (Pflicht)</p>
          <textarea
            data-testid="item-cancel-notes"
            data-ui="issue-detail.cancel-form.notes"
            value={cancelNotes}
            onChange={e => setCancelNotes(e.target.value)}
            className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y mb-2"
            style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '80px' }}
            placeholder="Warum wird dieses Issue storniert?"
          />
          <div className="flex gap-2">
            <button onClick={onCancelDismiss}
              data-ui="issue-detail.cancel-form.dismiss"
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '40px' }}>Abbrechen</button>
            <button data-testid="item-cancel-confirm" data-ui="issue-detail.cancel-form.confirm" onClick={onCancelConfirm}
              disabled={!cancelNotes.trim() || transitioning}
              className="px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--accent-danger)', minHeight: '40px', opacity: (!cancelNotes.trim() || transitioning) ? 0.5 : 1 }}>
              Stornieren
            </button>
          </div>
        </div>
      )}
    </footer>
  )
}
