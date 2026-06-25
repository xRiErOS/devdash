/**
 * GF-332 — ReviewsTabContent (05.30 Widgets). Review-Anzeige eines Issues.
 * Konkretisierung §4.14/D02: zusätzlich zur Runden-Historie eine UserStory-
 * Granularität (Goal/Background-Kontext + pro Eintrag UserStory-ItemList
 * accepted/rejected) — ANZEIGE; Aggregation passed/rejected = Backend BE2.
 * Geteilt SprintReviewPage ↔ IssueDetailsPage (D12). Präsentational.
 *
 * data-ui je Story-Wrapper UND je Element (PO spricht jedes 1:1 an).
 */
import ReviewsTabContent from '../../../components/ui/organisms/ReviewsTabContent.jsx'

const noop = () => {}

const ROUNDS = [
  { id: 2, review_status: 'not_passed', created_at: '2026-06-15T11:00:00', notes: 'Mehrfachauswahl fehlt noch — bitte nachziehen.' },
  { id: 1, review_status: 'passed', created_at: '2026-06-14T09:30:00', notes: 'Navigation und Filter erfüllt.' },
]

const US_ROUNDS = [
  {
    id: 1,
    review_status: 'not_passed',
    created_at: '2026-06-15T11:00:00',
    notes: 'us3 abgelehnt — Bulk-Select nicht umgesetzt. Bitte Issue erneut in_progress nehmen.',
    userStories: [
      { key: 'us1', title: 'Tastatur-Navigation der Issue-Liste', verdict: 'accepted' },
      { key: 'us2', title: 'Statusfilter per Tastenkürzel', verdict: 'accepted' },
      { key: 'us3', title: 'Mehrfachauswahl von Issues', verdict: 'rejected' },
    ],
  },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/ReviewsTabContent',
  component: ReviewsTabContent,
  tags: ['status:stable', 'qa_behavioral:open', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Runden-Historie (Bestandsmodell) — Verdict-Badge je Runde, read-only.
export const Default = {
  render: () => (
    <div data-ui="organism.reviews-tab-content.default" className="max-w-2xl">
      <ReviewsTabContent reviews={ROUNDS} onSelectRound={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Goal/Background-Kontext + pro Review-Eintrag UserStory-ItemList
// accepted/rejected (Konkretisierung §4.14/D02). Anzeige; Aggregation = BE2.
export const Main = {
  render: () => (
    <div data-ui="organism.reviews-tab-content.userstory" className="max-w-2xl">
      <ReviewsTabContent
        goal="Tastatur-Navigation der Issue-Liste als Kern-Flow für Power-User."
        background="Bestehende Liste hat keine Keyboard-Steuerung; Linear/Raycast setzen den Standard."
        reviews={US_ROUNDS}
        onSelectRound={noop}
      />
    </div>
  ),
}

// State_Empty: noch keine Reviews.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.reviews-tab-content.empty" className="max-w-2xl">
      <ReviewsTabContent reviews={[]} />
    </div>
  ),
}
