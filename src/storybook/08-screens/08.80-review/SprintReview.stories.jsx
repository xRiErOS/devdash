/**
 * GF-2 T11 — Sprint-Review Screen (08.80 Review). Erste Story im 08-Screens-Tier:
 * der V2-Review-View-Container (SprintReviewV2 → ReviewFlow, 06.80 stable) eingebettet
 * in die kanonische AppShell (05.80) — die echte Screen-Komposition.
 *
 * Daten: pre-Cutover gegen die SOLL-Fixture (user_stories[]). SprintReviewV2 besitzt
 * (noch) KEINE eigene fetch-Mutation — die Verdrahtung gegen die user_stories[]-API
 * + MSW-Wiring folgt im Cutover (T13). Konsistent mit der ReviewFlow-Scoping-Regel
 * (D-Q01): reine Orchestrierung → Callback-/UI-play-Asserts ohne MSW.
 *
 * Router-Decorator (MemoryRouter): SprintReviewV2.usePageTitle nutzt useLocation()
 * (Page-Chrome) — im echten App durch den Router gegeben, hier per Decorator.
 */
import { MemoryRouter } from 'react-router-dom'
import { within, screen, userEvent, expect, waitFor } from 'storybook/test'
import SprintReviewV2 from '../../../views/SprintReviewV2.jsx'
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import fixture from '../../01-foundations/01.40-backend-contract/fixtures/review-issue.json'

const meta = {
  title: '08 SCREENS/08.80 Review/SprintReview',
  component: SprintReviewV2,
  tags: ['status:stable', 'domain:review', 'design_version:v2'],
  parameters: { layout: 'fullscreen', fullBleed: true },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
}
export default meta

const us = fixture.user_stories
const issues = [
  { ...fixture, key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', review_status: 'pending', user_stories: us },
  { key: 'DD-8', title: 'Volltextsuche im Backlog', goal: 'Schnellfilter über key+title.', review_status: 'rejected', user_stories: us },
  { key: 'DD-9', title: 'Sort nach Verdict', goal: 'Offene zuerst.', review_status: 'passed', user_stories: us },
  { key: 'DD-10', title: 'Runden-Filter Default', goal: 'Nur offen/abgelehnt.', review_status: 'planned', user_stories: us },
]
// Screen = AppShell (3-Zonen-Frame) mit dem Review-View im Content-Outlet.
// #10: Breadcrumb trägt den Sprint-Kontext (nicht den AppShell-Demo-Default DD-251). Live
// setzt SprintReviewV2.usePageTitle(`Review: ${key}`) das Page-Chrome route-scoped.
const wrap = (args, ctx) => (
  <div data-ui={`screen.sprint-review.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="h-full">
    <AppShell breadcrumb={['DevDash', args.sprintKey ? `Sprint ${args.sprintKey}` : 'Sprint-Review']}>
      <SprintReviewV2 {...args} />
    </AppShell>
  </div>
)

// Default: Minimal-Props → SprintReviewV2 fällt auf die Einzel-Fixture zurück (kein Crash).
export const Default = { render: wrap, args: {} }

// Main: realistische gemischte Runde (Default-Filter offen/abgelehnt) im vollen Screen.
export const Main = {
  render: wrap,
  args: {
    issues,
    sprintKey: 'DD#1',
    sprintTitle: 'Sprint DD#1 — Multi-Tenant',
    sprintGoal: 'Multi-Tenant-Fundament: Projekt-Switcher + project_id-Scoping über alle Endpoints.',
    round: 2,
  },
}

// State_Empty: leere Runde (keine Issues) → Detail-Pane zeigt EmptyState.
export const State_Empty = {
  render: wrap,
  args: { issues: [], sprintKey: 'DD#1', round: 3 },
}

// Variant_OnlyRejected: R3-Default-Filter zeigt offene/abgelehnte zuerst (passed ausgeblendet).
export const Variant_OnlyRejected = {
  render: wrap,
  args: { issues: issues.filter((i) => i.review_status !== 'passed'), sprintKey: 'DD#1', round: 2 },
}

// Variant_ReReview (D04): bereits passed Issue (DD-9) erneut bewertbar (manueller Reopen, DD-662).
export const Variant_ReReview = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 4, selectedKey: 'DD-9' },
}

// Variant_Submitted: Runde übermittelt (review_submitted_at) → Edits gesperrt (DD-507).
export const Variant_Submitted = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2, submitted: true },
}

// ── Ebene-1 (Interaktions-play, KEIN MSW — D-Q01 Scoping) ──────────────────────
// Interaction_Search: Volltext im Such-Input filtert die Master-Liste (key+title)
// auch im vollen Screen-Kontext (AppShell).
export const Interaction_Search = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await waitFor(() => expect(c.getByRole('button', { name: /Multi-Tenant Projekt-Switcher/ })).toBeInTheDocument())
    await userEvent.type(c.getByRole('searchbox', { name: /Issues durchsuchen/ }), 'Volltext')
    await waitFor(() => expect(c.getByRole('button', { name: /Volltextsuche im Backlog/ })).toBeInTheDocument())
    expect(c.queryByRole('button', { name: /Multi-Tenant Projekt-Switcher/ })).toBeNull()
  },
}

// Interaction_Filter: Runden-Filter open→all macht abgenommene Issues (passed) sichtbar.
export const Interaction_Filter = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    expect(c.queryByRole('button', { name: /Sort nach Verdict/ })).toBeNull()
    await userEvent.click(c.getByRole('button', { name: /Sortieren & Filtern/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Sortieren & Filtern' })
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Alle' }))
    await waitFor(() => expect(c.getByRole('button', { name: /Sort nach Verdict/ })).toBeInTheDocument())
  },
}
