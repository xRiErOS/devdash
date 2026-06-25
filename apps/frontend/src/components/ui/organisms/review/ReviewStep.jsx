import Stack from '../../layout/Stack.jsx'
import EntityDetailHeader from '../../molecules/EntityDetailHeader.jsx'
import UserStoriesWidget from '../UserStoriesWidget.jsx'
import ReviewsTabContent from '../ReviewsTabContent.jsx'
import ReviewVerdict from './ReviewVerdict.jsx'

/**
 * ReviewStep — Detail-Einheit eines Issues im Review-Screen (GF-2 T7, 06.80 Deps & Review).
 * Komponiert: EntityDetailHeader (ID/Title/Goal) + UserStoriesWidget (review-readonly =
 * US-Pruefgrundlage mit Info-Overlay) + ReviewVerdict (binär, D01) + ReviewsTabContent
 * (Runden-History). Root data-ui: review-step. Praesentational, controlled.
 *
 * Backend-I01: `pending` = realer dritter review_status (offene Runde) — hier als
 * "offene Runde, noch nicht bewertet"-Zustand gerendert, NICHT als Verdict-Aktion (D01).
 */
export default function ReviewStep({
  issue,
  verdict = null,
  comment = '',
  onVerdict,
  onComment,
  onSubmit,
  onEdit,
  onUsVerdict,
  attachments = [],
  onFiles,
  onRemoveAttachment,
  submitting = false,
  disabled = false,
  reviews = [],
}) {
  if (!issue) return null
  const isPendingRound = !verdict && issue.review_status === 'pending'
  return (
    <div data-ui="review-step" className="flex flex-col">
      <Stack gap="md">
        <EntityDetailHeader id={issue.key} title={issue.title} goal={issue.goal} />

        {/* #8 (D01-Klärung id632): US-Prüfgrundlage MIT per-US-Verdict (us_verdict
            open/accepted/rejected) — NICHT read-only. Issue-Verdict (ReviewVerdict) bleibt
            ENTKOPPELT (kein Auto-Derive). Info-Overlay (alle US-Felder) zusätzlich sichtbar. */}
        <UserStoriesWidget
          heading="Prüfgrundlage — User Stories"
          stories={issue.user_stories || []}
          reviewMode
          onVerdict={onUsVerdict}
          disabled={disabled}
        />

        {isPendingRound && (
          <p data-ui="review-step.pending-hint" className="text-xs text-[var(--subtext0)]">
            Offene Runde — noch nicht bewertet.
          </p>
        )}

        <ReviewVerdict
          verdict={verdict}
          comment={comment}
          onVerdict={onVerdict}
          onComment={onComment}
          onSubmit={onSubmit}
          onEdit={onEdit}
          attachments={attachments}
          onFiles={onFiles}
          onRemoveAttachment={onRemoveAttachment}
          submitting={submitting}
          disabled={disabled}
        />

        <ReviewsTabContent item={issue} reviews={reviews} heading="Verlauf" dataUiScope="review-step.history" />
      </Stack>
    </div>
  )
}
