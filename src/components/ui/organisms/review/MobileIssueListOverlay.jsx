import { useState } from 'react'
import Modal from '../../molecules/Modal.jsx'
import Input from '../../atoms/Input.jsx'
import Button from '../../atoms/Button.jsx'
import SegmentedControl from '../../molecules/SegmentedControl.jsx'
import ReviewIssueRow from './ReviewIssueRow.jsx'
import { sortByVerdict, filterBySearch } from './reviewListControls.js'

// Bereits entschiedene Runde (Re-Review-fähig, DD-662). pending/open = laufende Runde.
const isVerdicted = (i) => ['passed', 'rejected', 'not_passed', 'planned'].includes(i.review_status)

/**
 * MobileIssueListOverlay — #11 b/#13. Mobile hat keine Master-Liste (Single-Column-Pager),
 * darum stellt dieses Overlay den Schnellwechsel über ~20 Issues bereit: Volltextsuche +
 * Status-Filter (touch-tauglich, #14) + komplette Issue-Liste. Zugleich Re-Review-Zugang
 * (#13, DD-662): der Default-Filter ist 'all', damit auch bereits bewertete Issues
 * (Abgenommen/Abgelehnt) anwählbar sind — Auswahl springt im Pager dorthin, wo der PO sie
 * erneut prüfen kann. Präsentational, controlled (open/onSelect/onClose).
 *
 * data-ui: review-flow.mobile.list (Dialog) · .list.search · .list.filter · .list.rereview-hint.
 */
const FILTER_OPTIONS = [
  { value: 'open', label: 'Offen/Abgelehnt' },
  { value: 'all', label: 'Alle' },
]
const isOpenForReview = (i) => i.review_status !== 'passed' && i.review_status !== 'cancelled'

export default function MobileIssueListOverlay({ open, onClose, issues = [], currentKey, onSelect, onReopen }) {
  // Default 'all' → Re-Review-Zugang zu bereits bewerteten Issues (#13).
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const byStatus = filter === 'open' ? issues.filter(isOpenForReview) : issues
  const visible = sortByVerdict(filterBySearch(byStatus, search), 'asc')

  const pick = (key) => {
    onSelect?.(key)
    onClose?.()
  }
  // #13/DD-662: Re-Review eines entschiedenen Issues — Backend öffnet eine frische pending-Runde
  // (POST /api/backlog/:id/review/reopen via SprintReviewV2.applyReopen), Pager springt dorthin.
  const reopen = (key) => {
    onReopen?.(key)
    onSelect?.(key)
    onClose?.()
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Issues" dialogDataUi="review-flow.mobile.list">
      <div className="flex flex-col gap-3" data-ui="review-flow.mobile.list.body">
        <Input
          data-ui="review-flow.mobile.list.search"
          type="search"
          surface="bordered"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Issues durchsuchen (ID/Titel)…"
          aria-label="Issues durchsuchen"
        />
        <div data-ui="review-flow.mobile.list.filter">
          <SegmentedControl
            ariaLabel="Status-Filter"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
            size="touch"
            className="w-full"
          />
        </div>
        <p data-ui="review-flow.mobile.list.rereview-hint" className="m-0 text-xs text-[var(--subtext0)]">
          Bereits bewertete Issues (Abgenommen/Abgelehnt) anwählen, um sie erneut zu prüfen (Re-Review).
        </p>
        <div className="flex flex-col gap-1">
          {visible.map((issue) => (
            <div key={issue.key} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <ReviewIssueRow issue={issue} selected={issue.key === currentKey} onSelect={pick} />
              </div>
              {onReopen && isVerdicted(issue) && (
                <Button
                  data-ui="review-flow.mobile.list.reopen"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => reopen(issue.key)}
                >
                  Re-Review
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
