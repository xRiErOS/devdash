/**
 * #11 b/#13 — MobileIssueListOverlay (05.70 Review). Mobile-Schnellwechsel über die Issues
 * (Mobile hat keine Master-Liste) + Status-Filter (touch) + Re-Review-Zugang zu bereits
 * bewerteten Issues (DD-662). Präsentational, controlled (open/onSelect/onClose).
 */
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import MobileIssueListOverlay from '../../../components/ui/organisms/review/MobileIssueListOverlay.jsx'

const meta = {
  title: '05 ORGANISMS/05.70 Review/MobileIssueListOverlay',
  component: MobileIssueListOverlay,
  // design_version:v1 = GF-411-Klassifikator-Verdikt (marker-basiert: dieses File trägt keinen
  // Terminal-Look-Marker; Override-Liste liegt in specs-DD/main). Epoche-Tag, kein Qualitätssignal.
  tags: ['status:stable', 'qa_behavioral:open', 'domain:review', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const issues = [
  { key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', goal: 'Projekt-Switcher + Scoping.', review_status: 'pending' },
  { key: 'DD-8', title: 'Volltextsuche im Backlog', goal: 'Schnellfilter key+title.', review_status: 'rejected' },
  { key: 'DD-9', title: 'Sort nach Verdict', goal: 'Offene zuerst.', review_status: 'passed' },
  { key: 'DD-10', title: 'Runden-Filter Default', goal: 'Nur offen/abgelehnt.', review_status: 'planned' },
]

const wrap = (args, ctx) => (
  <div
    data-ui={`organism.mobile-issue-list-overlay.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`}
    className="h-[640px]"
  >
    <MobileIssueListOverlay {...args} />
  </div>
)

// Default: geschlossen (kein Overlay sichtbar) — controlled-uncontrolled-Default.
export const Default = { render: wrap, args: { issues, currentKey: 'DD-7', onSelect: () => {}, onClose: () => {} } }

// Main (gf-tier-story-names Pflicht): geöffnetes Overlay mit voller Liste inkl. bewerteter
// Issues (Re-Review-Zugang per Re-Review-Button, #13/DD-662) + Filter (touch) + Suche.
export const Main = {
  render: wrap,
  args: { open: true, issues, currentKey: 'DD-7', onSelect: () => {}, onClose: () => {}, onReopen: () => {} },
}

// Interaction_Reopen (#13/DD-662): "Re-Review" auf einem bewerteten Issue (DD-9 passed) ruft
// onReopen(key) → SprintReviewV2 öffnet die Runde via POST /api/backlog/:id/review/reopen.
export const Interaction_Reopen = {
  render: wrap,
  args: { open: true, issues, currentKey: 'DD-7', onSelect: fn(), onClose: fn(), onReopen: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement)
    const buttons = c.getAllByRole('button', { name: 'Re-Review' })
    expect(buttons.length).toBeGreaterThan(0)
    await userEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(args.onReopen).toHaveBeenCalled())
  },
}
