/**
 * GF-2 T5 — ReviewIssueRow (06.70 Review). Master-Listen-Zeile des Review-Screens:
 * ID/Title/Goal-Kurz + Verdict-Badge. Praesentational, controlled (selected/onSelect).
 * Verdict-Zustaende = Runden-Projektion (pending/rejected/passed). Such-/Sort-Anker
 * liegen im Listen-Container (ReviewFlow, T9), nicht in der Row.
 */
import ReviewIssueRow from '../../../components/ui/organisms/review/ReviewIssueRow.jsx'

const meta = {
  title: '05 ORGANISMS/05.70 Review/ReviewIssueRow',
  component: ReviewIssueRow,
  tags: ['status:review', 'qa_checklist:done', 'qa_behavioral:open', 'domain:review', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

const base = { key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', goal: 'PO wechselt zwischen Projekten.' }

export const Default = {
  render: (args, ctx) => (
    <div data-ui={`organism.review-issue-row.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="max-w-md">
      <ReviewIssueRow {...args} />
    </div>
  ),
  args: { issue: {} },
}

export const Variant_Pending = {
  render: Default.render,
  args: { issue: { ...base, review_status: 'pending' } },
}

export const Variant_Rejected = {
  render: Default.render,
  args: { issue: { ...base, review_status: 'rejected' } },
}

export const Variant_Passed = {
  render: Default.render,
  args: { issue: { ...base, review_status: 'passed' }, selected: true },
}

// Hauptfall (Gate gf-tier-story-names: Main Pflicht) — eigenständiger Demo-Zustand (nicht == Variant_Pending).
export const Main = {
  render: Default.render,
  args: { issue: { key: 'DD-42', title: 'Sprint-Lifecycle Härtung', goal: 'KI schließt nie einen Sprint (DD-186).', review_status: 'passed' } },
}
