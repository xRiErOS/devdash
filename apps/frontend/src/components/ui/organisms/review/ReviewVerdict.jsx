import { useState } from 'react'
import Button from '../../atoms/Button.jsx'
import MarkdownField from '../../molecules/MarkdownField.jsx'
import AttachmentDropzone from '../../molecules/AttachmentDropzone.jsx'
import WidgetBase from '../WidgetBase.jsx'

/**
 * ReviewVerdict — binäre Verdict-Abgabe eines Issues (GF-2 T6, 06.80 Deps & Review).
 * D01: nur pass/reject (kein pending-Button — pending ist Listen-/Render-Zustand). Reject
 * erfordert verbindlich ein Feedback (comment), sonst ist Submit gesperrt (canSubmit).
 * PO-Notizen (MarkdownField) + Screenshots (AttachmentDropzone) sind Teil der Abgabe.
 *
 * #12 progressive (Mobile): Initial nur die zwei Buttons (Thumb-Zone schlank). "Abnehmen"
 * sendet sofort (pass braucht kein Feedback). "Ablehnen" enthüllt erst das Feedback-Feld +
 * Anhänge und schaltet die Buttons auf 'Ablehnung absenden' (canSubmit-gated) / 'Abbrechen'.
 * Desktop (progressive=false) zeigt das Feedback-Feld unverändert immer an.
 *
 * data-ui: review-verdict.pass / .reject / .cancel / .edit. Praesentational, controlled
 * (comment), mit lokalem UI-State nur für die Progressive-Disclosure (rejecting).
 */
export function canSubmit({ verdict, comment }) {
  if (verdict === 'reject') return Boolean(comment && comment.trim())
  return verdict === 'pass'
}

export default function ReviewVerdict({
  comment = '',
  onComment,
  onSubmit,
  onEdit,
  attachments = [],
  onFiles,
  onRemoveAttachment,
  submitting = false,
  disabled = false,
  progressive = false,
}) {
  // #12: Mobile-Reject-Enthüllung. Desktop ignoriert diesen State (Feld immer sichtbar).
  const [rejecting, setRejecting] = useState(false)
  const rejectReady = canSubmit({ verdict: 'reject', comment })
  const submit = (v) => {
    onSubmit?.(v, comment)
    setRejecting(false)
  }

  // #12 Initialzustand (Mobile, noch nicht am Ablehnen): nur Buttons, Feedback verborgen.
  if (progressive && !rejecting) {
    return (
      <WidgetBase heading="Bewertung" dataUi="review-verdict">
        <div className="flex items-center gap-2" data-ui="review-verdict.actions">
          <Button
            data-ui="review-verdict.pass"
            variant="success"
            appearance="solid"
            size="sm"
            loading={submitting}
            disabled={disabled || submitting}
            onClick={() => submit('pass')}
          >
            Abnehmen
          </Button>
          <Button
            data-ui="review-verdict.reject"
            variant="danger"
            appearance="solid"
            size="sm"
            disabled={disabled || submitting}
            onClick={() => setRejecting(true)}
          >
            Ablehnen
          </Button>
        </div>
      </WidgetBase>
    )
  }

  // Voll-Ansicht: Desktop (immer) ODER Mobile nach Reject-Enthüllung.
  return (
    <WidgetBase heading="Bewertung" dataUi="review-verdict">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--subtext0)]">
            Feedback<span className="text-[var(--subtext0)]"> (Pflicht bei Ablehnung)</span>
          </label>
          <MarkdownField
            value={comment}
            onChange={onComment}
            placeholder="Was fehlt? Notizen zur Bewertung…"
            disabled={disabled}
          />
          <AttachmentDropzone
            attachments={attachments}
            onFiles={onFiles}
            onRemove={onRemoveAttachment}
            label="Screenshot ablegen…"
          />
        </div>

        <div className="flex items-center gap-2">
          {progressive ? (
            <>
              {/* #12: enthüllte Reject-Abgabe — absenden (gated) / abbrechen. */}
              <Button
                data-ui="review-verdict.reject"
                variant="danger"
                appearance="solid"
                size="sm"
                loading={submitting}
                disabled={disabled || submitting || !rejectReady}
                title={rejectReady ? undefined : 'Ablehnung erfordert ein Feedback.'}
                onClick={() => submit('reject')}
              >
                Ablehnung absenden
              </Button>
              <Button
                data-ui="review-verdict.cancel"
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => setRejecting(false)}
              >
                Abbrechen
              </Button>
            </>
          ) : (
            <>
              {/* Desktop: Klick = Submit. solid Fill (Kanon, PO-Mockup D). */}
              <Button
                data-ui="review-verdict.pass"
                variant="success"
                appearance="solid"
                size="sm"
                loading={submitting}
                disabled={disabled || submitting}
                onClick={() => submit('pass')}
              >
                Abnehmen
              </Button>
              <Button
                data-ui="review-verdict.reject"
                variant="danger"
                appearance="solid"
                size="sm"
                loading={submitting}
                disabled={disabled || submitting || !rejectReady}
                title={rejectReady ? undefined : 'Ablehnung erfordert ein Feedback.'}
                onClick={() => submit('reject')}
              >
                Ablehnen
              </Button>
              {onEdit && (
                <Button data-ui="review-verdict.edit" variant="ghost" size="sm" disabled={disabled} onClick={onEdit}>
                  Bearbeiten
                </Button>
              )}
            </>
          )}
        </div>
        {!rejectReady && (
          <p data-ui="review-verdict.feedback-required" className="text-xs text-[var(--subtext0)]">
            Ablehnen erst möglich, wenn ein Feedback erfasst ist.
          </p>
        )}
      </div>
    </WidgetBase>
  )
}
