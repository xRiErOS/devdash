/**
 * GF-2 T12 — Sprint-Review Mobile-Screen (08.80 Review, FEAT-31). Daumentaugliche
 * Single-Column-Fassung: SprintReviewV2 mit forceLayout="mobile" → ReviewFlowMobile
 * (Pager + Thumb-Zone-Verdict + Auto-Advance). V2-Ersatz der alten SprintReviewMobile.jsx
 * (Replace-not-Refactor, T13). Phone-Frame-Wrapper (max-w) für realistische Breite.
 *
 * Scope-Hinweis: Quick-Edit-Bottom-Sheet (Sprint/Priorität, alte DD-604) ist im V2-Mobile
 * (noch) NICHT portiert → als Folge-Improvement geflaggt (Roadmap §8). Kern-FEAT-31
 * (Thumb-Zone-Verdict binär D01 + Auto-Advance + Pager) ist abgedeckt.
 */
import { MemoryRouter } from 'react-router-dom'
import { within, userEvent, expect, waitFor } from 'storybook/test'
import SprintReviewV2 from '../../../views/SprintReviewV2.jsx'
import fixture from '../../01-foundations/01.40-backend-contract/fixtures/review-issue.json'

const meta = {
  title: '08 SCREENS/08.80 Review/SprintReviewMobile',
  component: SprintReviewV2,
  tags: ['status:stable', 'domain:review', 'design_version:v2'],
  parameters: { layout: 'fullscreen', fullBleed: true },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: { forceLayout: 'mobile' },
}
export default meta

const us = fixture.user_stories
const issues = [
  { ...fixture, key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', review_status: 'pending', user_stories: us },
  { key: 'DD-8', title: 'Volltextsuche im Backlog', goal: 'Schnellfilter über key+title.', review_status: 'pending', user_stories: us },
  { key: 'DD-9', title: 'Sort nach Verdict', goal: 'Offene zuerst.', review_status: 'rejected', user_stories: us },
]

// Phone-Frame: feste Breite (max-w) + VIEWPORT-gebundene Höhe (#15). Vorher h-[844px] fix →
// auf iPhone SE (375×667) überragte der Frame den Viewport → Body-Scroll PLUS innerer
// overflow-y-auto = doppelter Scrollbalken. h-[100dvh] bindet den Frame an den jeweils
// gewählten Viewport (390×844 / 375×667) → nur EIN Scroll-Container (ReviewFlowMobile-Content).
const wrap = (args, ctx) => (
  <div data-ui={`screen.sprint-review-mobile.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="mx-auto h-[100dvh] w-full max-w-[390px] overflow-hidden border-x border-[var(--surface2)]">
    <SprintReviewV2 {...args} />
  </div>
)

// Default: Minimal-Props → Einzel-Fixture im Mobile-Pager.
export const Default = { render: wrap, args: {} }

// Main: realistische Runde (3 Issues) — Pager 1/3, erstes Issue offen.
export const Main = { render: wrap, args: { issues, sprintKey: 'DD#1', round: 2 } }

// Variant_Verdict: offenes Issue, Verdict-Thumb-Zone bereit (binär pass/reject, D01).
export const Variant_Verdict = { render: wrap, args: { issues, sprintKey: 'DD#1', round: 2 } }

// Variant_Submitted: übermittelte Runde → Verdict gesperrt (DD-507).
export const Variant_Submitted = { render: wrap, args: { issues, sprintKey: 'DD#1', round: 2, submitted: true } }

// Interaction_AutoAdvance (play): Pager vor → nächstes Issue (FEAT-31-Navigation).
export const Interaction_AutoAdvance = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // Start: Issue 1/3 (DD-7).
    await waitFor(() => expect(c.getByText('1 / 3')).toBeInTheDocument())
    await userEvent.click(c.getByRole('button', { name: 'Nächstes Issue' }))
    // Pager weiter: 2/3 (DD-8).
    await waitFor(() => expect(c.getByText('2 / 3')).toBeInTheDocument())
  },
}
