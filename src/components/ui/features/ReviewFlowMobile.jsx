import { useState } from 'react'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import Stack from '../layout/Stack.jsx'
import Cluster from '../layout/Cluster.jsx'
import IconButton from '../atoms/IconButton.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import StickyActionBar from '../atoms/StickyActionBar.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import EntityDetailHeader from '../molecules/EntityDetailHeader.jsx'
import UserStoriesWidget from '../organisms/UserStoriesWidget.jsx'
import ReviewVerdict from '../organisms/review/ReviewVerdict.jsx'
import MobileIssueListOverlay from '../organisms/review/MobileIssueListOverlay.jsx'

/**
 * ReviewFlowMobile — daumentaugliche Mobile-Fassung des Review-Flows (GF-2 T12, FEAT-31).
 * Single-Column-Pager statt Master-Detail: ein Issue je Ansicht (EntityDetailHeader +
 * UserStoriesWidget review-readonly als Prüfgrundlage), Verdict in der Thumb-Zone (Sticky
 * Bottom-Bar, binär D01 via ReviewVerdict), Pager (vor/zurück) + Position oben.
 *
 * Auto-Advance (FEAT-31): nach abgegebenem Verdict springt die Ansicht zum nächsten Issue.
 * Root data-ui: review-flow.mobile.root. V2-Ersatz für die alte SprintReviewMobile.jsx
 * (Replace-not-Refactor, T13) — Icon-Registry-konform (kein lucide-Direktimport), echte Tokens.
 */
export default function ReviewFlowMobile({
  issues = [],
  round = 1,
  verdict = null,
  comment = '',
  onVerdict,
  onComment,
  onSubmit,
  onUsVerdict,
  onReopen,
  submitting = false,
  disabled = false,
}) {
  const [index, setIndex] = useState(0)
  const [listOpen, setListOpen] = useState(false)

  if (!issues.length) {
    return (
      <EmptyState
        data-ui="review-flow.mobile.empty"
        title="Keine Issues zu reviewen"
        description="Alle Issues dieser Runde sind abgenommen."
      />
    )
  }

  const i = Math.min(index, issues.length - 1)
  const issue = issues[i]
  const total = issues.length
  const goPrev = () => setIndex((v) => Math.max(0, v - 1))
  const goNext = () => setIndex((v) => Math.min(total - 1, v + 1))

  // Auto-Advance (FEAT-31): Verdict-Submit reicht hoch UND springt zum nächsten Issue.
  // T13: das aktuelle Issue wird als 3. Arg mitgereicht (additiv) — der Live-Container
  // (SprintReviewV2) braucht es für applyVerdict, da der Pager-Index hier intern liegt.
  const handleSubmit = (v, c) => {
    onSubmit?.(v, c, issue)
    if (i < total - 1) goNext()
  }

  return (
    <div data-ui="review-flow.mobile.root" className="flex h-full flex-col font-sans">
      {/* #11/#13-Layout (-6-): LINKS Affordanz (Issue-Liste/Filter + Re-Review, da Mobile keine
          Master-Liste hat) · MITTE Status + Position · RECHTS beide Pager-Buttons nebeneinander
          (echte Chevron-Icons aus der Registry + data-ui prev/next, #11 a). */}
      <Cluster
        justify="between"
        align="center"
        className="flex-nowrap border-b border-[var(--surface2)] px-3 py-2"
        data-ui="review-flow.mobile.pager"
      >
        <IconButton
          icon={<Icon name="list" role="neutral" size={18} />}
          label="Issue-Liste & Filter"
          onClick={() => setListOpen(true)}
          data-ui="review-flow.mobile.list-trigger"
        />
        <Cluster gap="xs" align="center" className="flex-nowrap">
          <StatusBadge status={issue.review_status} data-ui="review-flow.mobile.status" />
          <span className="text-sm font-medium text-[var(--text)]" data-ui="review-flow.mobile.position">
            {i + 1} / {total}
          </span>
        </Cluster>
        <Cluster gap="xs" align="center" className="flex-nowrap">
          <IconButton
            icon={<Icon name="chevron-left" role="neutral" size={18} />}
            label="Vorheriges Issue"
            onClick={goPrev}
            disabled={i === 0}
            data-ui="review-flow.mobile.pager.prev"
          />
          <IconButton
            icon={<Icon name="chevron-right" role="neutral" size={18} />}
            label="Nächstes Issue"
            onClick={goNext}
            disabled={i === total - 1}
            data-ui="review-flow.mobile.pager.next"
          />
        </Cluster>
      </Cluster>

      {/* #11 b/#13: Issue-Liste/Filter + Re-Review-Zugang (zentriertes Overlay). */}
      <MobileIssueListOverlay
        open={listOpen}
        onClose={() => setListOpen(false)}
        issues={issues}
        currentKey={issue.key}
        onSelect={(key) => {
          const idx = issues.findIndex((x) => x.key === key)
          if (idx >= 0) setIndex(idx)
        }}
        onReopen={onReopen}
      />

      {/* Scroll-Content: Issue-Header + US-Prüfgrundlage (read-only). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <Stack gap="md">
          <EntityDetailHeader id={issue.key} title={issue.title} goal={issue.goal} size="detail" />
          {/* #8 (D01-Klärung id632): per-US-Verdict auch mobil — NICHT read-only.
              onUsVerdict(usKey, verdict) trägt den Index-gebundenen Issue-Kontext im
              Live-Container (SprintReviewV2 resolved key→id im aktuellen Pager-Issue). */}
          <UserStoriesWidget
            heading="Prüfgrundlage — User Stories"
            stories={issue.user_stories || []}
            reviewMode
            onVerdict={onUsVerdict ? (usKey, v) => onUsVerdict(usKey, v, issue) : undefined}
            filterSize="touch"
            disabled={disabled}
          />
          <p data-ui="review-flow.mobile.advance" className="text-xs text-[var(--subtext0)]">
            Nach dem Verdict springt die Ansicht automatisch zum nächsten Issue (Runde {round}).
          </p>
        </Stack>
      </div>

      {/* Thumb-Zone: binäres Verdict + Pflicht-Feedback (D01), Sticky am unteren Rand. */}
      <StickyActionBar data-ui="review-flow.mobile.verdict" className="!justify-stretch">
        <div className="w-full">
          {/* #12: Mobile-Progressive-Disclosure — nur Buttons, reject enthüllt Feld + absenden/abbrechen. */}
          <ReviewVerdict
            verdict={verdict}
            comment={comment}
            onVerdict={onVerdict}
            onComment={onComment}
            onSubmit={handleSubmit}
            submitting={submitting}
            disabled={disabled}
            progressive
          />
        </div>
      </StickyActionBar>
    </div>
  )
}
