/**
 * GF-2 T7 — ReviewStep (06.70 Review). Detail-Einheit eines Issues: Header (ID/Title/Goal) +
 * US-Prüfgrundlage (review-readonly + Info-Overlay) + binäres Verdict (D01) + Runden-History.
 * Export-Namen binden ans states:-Vokabular (D08) + Domänen-Szenarien Pending/ReReview.
 */
import ReviewStep from '../../../components/ui/organisms/review/ReviewStep.jsx'
import fixture from '../../01-foundations/01.40-backend-contract/fixtures/review-issue.json'

const meta = {
  title: '05 ORGANISMS/05.70 Review/ReviewStep',
  component: ReviewStep,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:open', 'domain:review', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

const wrap = (args, ctx) => (
  <div data-ui={`organism.review-step.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="max-w-3xl">
    <ReviewStep {...args} />
  </div>
)

// Default: minimaler Default-Props-Zustand (leeres Issue, kein Verdict).
export const Default = { render: wrap, args: { issue: {} } }
export const Variant_Pending = { render: wrap, args: { issue: fixture } }

// Ready: pass gewählt → Submit frei.
export const Variant_Ready = { render: wrap, args: { issue: fixture, verdict: 'pass', comment: 'Alle US erfüllt.' } }

// Editing: reject gewählt, Feedback wird getippt.
export const State_Editing = { render: wrap, args: { issue: fixture, verdict: 'reject', comment: 'US-2 fehlt …' } }

// ValidationError: reject ohne Feedback → Submit gesperrt.
export const Variant_ValidationError = { render: wrap, args: { issue: fixture, verdict: 'reject', comment: '' } }

// Submitting: Abgabe läuft.
export const Variant_Submitting = { render: wrap, args: { issue: fixture, verdict: 'pass', comment: 'OK', submitting: true } }

// Success: abgenommen.
export const Variant_Success = { render: wrap, args: { issue: { ...fixture, review_status: 'passed' }, verdict: 'pass', comment: 'Abgenommen.' } }

// ReReview (D04): bereits passed Issue erneut bewertbar (manueller Reopen, DD-662).
export const Variant_ReReview = { render: wrap, args: { issue: { ...fixture, review_status: 'passed' } } }

// Hauptfall (Gate gf-tier-story-names: Main Pflicht) — voller Demo-Issue mit aktiver Bewertung (distinkt zu Variant_Pending).
export const Main = { render: wrap, args: { issue: fixture, verdict: 'pass', comment: 'Alle Akzeptanzkriterien erfüllt, Demo gesichtet — bereit zur Abnahme.' } }
