/**
 * GF-2 T8 — ReviewSummary (06.70 Review). Runden-Zusammenfassung + Copy-Markdown
 * (buildRoundMarkdown ✅/❌ je Issue + Feedback). DD-186: `complete` ist nur ein Marker
 * (kein Sprint-Abschluss, PO-exklusiv), disabled bis alle Issues abgenommen (allPassed).
 */
import ReviewSummary from '../../../components/ui/organisms/review/ReviewSummary.jsx'

const meta = {
  title: '05 ORGANISMS/05.70 Review/ReviewSummary',
  component: ReviewSummary,
  tags: ['status:review', 'qa_checklist:done', 'qa_behavioral:open', 'domain:review', 'design_version:v1'],
  parameters: { layout: 'padded' },
}
export default meta

const mixed = [
  { key: 'DD-1', title: 'Alpha', review_status: 'passed' },
  { key: 'DD-2', title: 'Beta', review_status: 'rejected', comment: 'US-2 fehlt' },
  { key: 'DD-3', title: 'Gamma', review_status: 'pending' },
]
const all = [
  { key: 'DD-1', title: 'Alpha', review_status: 'passed' },
  { key: 'DD-2', title: 'Beta', review_status: 'passed' },
]
const mainScenario = [
  { key: 'DD-11', title: 'Auth-Flow härten', review_status: 'passed' },
  { key: 'DD-12', title: 'Capture-Host Allowlist', review_status: 'passed' },
  { key: 'DD-13', title: 'Surface-Ebenen-Bindung', review_status: 'rejected', comment: 'L2-Token statt L3 in Sidebar' },
  { key: 'DD-14', title: 'qa_checklist-Gate', review_status: 'pending' },
  { key: 'DD-15', title: 'Re-Audit-Loop', review_status: 'pending' },
]

const wrap = (args, ctx) => (
  <div data-ui={`organism.review-summary.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="max-w-2xl">
    <ReviewSummary {...args} />
  </div>
)

// Default: Default-Props / Minimalzustand (kein Inhalt).
export const Default = { render: wrap, args: {} }
export const Variant_Pending = { render: wrap, args: { sprintKey: 'DD#1', round: 2, issues: mixed } }

// AllPassed: alle abgenommen → complete-Marker aktiv (DD-186 nur Marker).
export const Variant_AllPassed = { render: wrap, args: { sprintKey: 'DD#1', round: 3, issues: all } }

// Success: kopierbarer Stand eines ANDEREN abgenommenen Sprints (distinkt zu AllPassed).
export const Variant_Success = { render: wrap, args: { sprintKey: 'DD#9', round: 5, issues: all } }

// Hauptfall (Gate gf-tier-story-names: Main Pflicht) — volle Demo-Daten, eigenständig (nicht == Variant_Pending).
export const Main = { render: wrap, args: { sprintKey: 'DD#7', round: 4, issues: mainScenario } }
