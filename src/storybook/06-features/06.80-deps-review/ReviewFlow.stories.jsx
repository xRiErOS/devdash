/**
 * GF-2 T9 — ReviewFlow (06.70 Review). Feature-Komposition des Review-Screens als Master-Detail:
 * Listen-Container (Suche/Sort/Runden-Filter + ReviewIssueRow) + ReviewStep + ReviewSummary.
 * Default-Filter "nur offen/abgelehnt" (R3/D04). Export-Namen = states:-Vokabular (D08) +
 * Domänen-Szenarien (Empty/OnlyRejected/ReReview/Submitted). MDX dokumentiert die Tier-Abweichung.
 */
import { useState } from 'react'
import { within, screen, userEvent, expect, waitFor, fn } from 'storybook/test'
import ReviewFlow from '../../../components/ui/features/ReviewFlow.jsx'
import fixture from '../../01-foundations/01.40-backend-contract/fixtures/review-issue.json'

const meta = {
  title: '06 FEATURES/06.80 Deps & Review/ReviewFlow',
  component: ReviewFlow,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:done', 'domain:review', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const us = fixture.user_stories
const issues = [
  { ...fixture, key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', review_status: 'pending', user_stories: us },
  { key: 'DD-8', title: 'Volltextsuche im Backlog', goal: 'Schnellfilter über key+title.', review_status: 'rejected', user_stories: us },
  { key: 'DD-9', title: 'Sort nach Verdict', goal: 'Offene zuerst.', review_status: 'passed', user_stories: us },
  { key: 'DD-10', title: 'Runden-Filter Default', goal: 'Nur offen/abgelehnt.', review_status: 'planned', user_stories: us },
]
const allPassedIssues = issues.map((i) => ({ ...i, review_status: 'passed' }))

const wrap = (args, ctx) => (
  <div data-ui={`feature.review-flow.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="h-[720px]">
    <ReviewFlow {...args} />
  </div>
)

// Default: no-args → Default-Props (leere Liste, EmptyState-Pane).
export const Default = { render: wrap, args: {} }

// Empty: alle abgenommen → Liste (offen-Filter) leer, Pane zeigt EmptyState.
export const State_Empty = { render: wrap, args: { issues: allPassedIssues, sprintKey: 'DD#1', round: 3 } }

// OnlyRejected: R3-Default-Filter zeigt offene/abgelehnte zuerst.
export const Variant_OnlyRejected = {
  render: wrap,
  args: { issues: issues.filter((i) => i.review_status !== 'passed'), sprintKey: 'DD#1', round: 2 },
}

// ReReview (D04): bereits passed Issue erneut bewertbar (manueller Reopen, DD-662) — über Alle-Filter sichtbar.
export const Variant_ReReview = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 4, selectedKey: 'DD-9' },
}

// Submitted: Runde übermittelt — Status-Badge "wartet auf Re-Review" (#9) + Edits gesperrt.
export const Variant_Submitted = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2, selectedKey: 'DD-7', submitted: true, stepProps: { disabled: true } },
}

// Hauptfall (Gate gf-tier-story-names: Main Pflicht) — volle gemischte Runde, Default-Filter offen/abgelehnt.
export const Main = { render: wrap, args: { issues, sprintKey: 'DD#1', sprintTitle: 'Sprint DD#1 — Multi-Tenant', sprintGoal: 'Multi-Tenant-Fundament: Projekt-Switcher + project_id-Scoping über alle Endpoints.', round: 2 } }

// ── Ebene-1 (Interaktions-play, KEIN MSW) ──────────────────────────────────────
// ReviewFlow ist reine Orchestrierung (Suche/Sort/Filter/Select + onComplete-Callback).
// Es besitzt KEINE eigene fetch-Mutation — die Verdict-Persistenz lebt in ReviewVerdict/
// ReviewStep (separat zu härten). Daher Callback-/UI-Asserts ohne MSW (D-Q01, Scoping-Regel).

// Interaction_Search: Volltext im Such-Input filtert die Master-Liste (key+title, Substring).
export const Interaction_Search = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // Default-Filter "open" zeigt DD-7/DD-8/DD-10; DD-9 (passed) ist ausgeblendet.
    await waitFor(() => expect(c.getByRole('button', { name: /Multi-Tenant Projekt-Switcher/ })).toBeInTheDocument())
    await userEvent.type(c.getByRole('searchbox', { name: /Issues durchsuchen/ }), 'Volltext')
    // Nach Suche bleibt nur DD-8 ("Volltextsuche im Backlog") in der Liste.
    await waitFor(() => expect(c.getByRole('button', { name: /Volltextsuche im Backlog/ })).toBeInTheDocument())
    expect(c.queryByRole('button', { name: /Multi-Tenant Projekt-Switcher/ })).toBeNull()
    expect(c.queryByRole('button', { name: /Runden-Filter Default/ })).toBeNull()
  },
}

// Interaction_Select: Klick auf eine Listen-Zeile selektiert das Issue (uncontrolled) → Detail-Pane
// (ReviewStep) rendert das gewählte Issue, Zeile bekommt aria-pressed.
export const Interaction_Select = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // Initial selektiert = erstes sichtbares Issue (DD-7) → Detail zeigt dessen Header.
    const step = () => canvasElement.querySelector('[data-ui="review-step"]')
    await waitFor(() => expect(step().textContent).toContain('Multi-Tenant Projekt-Switcher'))
    const row = c.getByRole('button', { name: /Volltextsuche im Backlog/ })
    await userEvent.click(row)
    // Auswahl gewechselt: Zeile aria-pressed + Detail-Pane folgt dem gewählten Issue (DD-8).
    await waitFor(() => expect(row).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(step().textContent).toContain('Volltextsuche im Backlog'))
  },
}

// Interaction_Filter: Runden-Filter open→all macht bereits abgenommene Issues (passed) sichtbar.
export const Interaction_Filter = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // Default "open": passed-Issue (DD-9) ist NICHT in der Liste.
    expect(c.queryByRole('button', { name: /Sort nach Verdict/ })).toBeNull()
    // Filter-Popover öffnen (Inhalt ist portal'd → auf den offenen Dialog scopen).
    await userEvent.click(c.getByRole('button', { name: /Sortieren & Filtern/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Sortieren & Filtern' })
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Alle' }))
    // Klick-Beweis: Trigger meldet 1 aktiven Filter; passed-Issue erscheint in der Master-Liste.
    await waitFor(() => expect(c.getByRole('button', { name: /Sortieren & Filtern \(1 aktiv\)/ })).toBeInTheDocument())
    await waitFor(() => expect(c.getByRole('button', { name: /Sort nach Verdict/ })).toBeInTheDocument())
  },
}

// Interaction_Sort: Sort-Richtung asc→desc dreht die Verdict-Reihenfolge der sichtbaren Zeilen.
export const Interaction_Sort = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const rowKeys = () =>
      [...canvasElement.querySelectorAll('[data-ui="review-issue-row"]')].map((r) => r.textContent)
    // asc (Offen zuerst): pending(DD-7) < zurückgeworfen(DD-8/DD-10).
    await waitFor(() => expect(rowKeys()[0]).toContain('DD-7'))
    await userEvent.click(c.getByRole('button', { name: /Sortieren & Filtern/ }))
    // Sort-Select öffnen (portal) → "Abgenommen zuerst" (desc).
    await userEvent.click(await screen.findByRole('button', { name: 'Sortierung' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Abgenommen zuerst' }))
    // desc: Reihenfolge umgekehrt → DD-7 (pending) liegt nun zuletzt.
    await waitFor(() => expect(rowKeys()[rowKeys().length - 1]).toContain('DD-7'))
  },
}

// Interaction_Complete: alle Issues passed → Gate offen. Das selektierte (abgenommene) Issue
// trägt seine Review-Runde in der History (count 1, kein Empty) — Klick auf "Review abschließen"
// feuert onComplete.
const completeSpy = fn()
const passedRound = [{ id: 'rnd-1', review_status: 'passed', notes: 'Akzeptanzkriterien erfüllt.' }]
export const Interaction_Complete = {
  render: wrap,
  args: {
    issues: allPassedIssues,
    sprintKey: 'DD#1',
    round: 3,
    selectedKey: 'DD-7',
    stepProps: { reviews: passedRound },
    onComplete: completeSpy,
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const s = within(canvasElement.querySelector('[data-ui="review-step"]'))
    completeSpy.mockClear()
    // Abgenommenes Issue → History zeigt die Runde: Empty weg, count = 1.
    expect(s.getByText(/Review-Runden \(1\)/)).toBeInTheDocument()
    expect(s.queryByText('Noch keine Reviews')).toBeNull()
    // Gate offen → abschließen feuert onComplete.
    const btn = c.getByRole('button', { name: 'Review abschließen' })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    await waitFor(() => expect(completeSpy).toHaveBeenCalledTimes(1))
  },
}

// Interaction_CompleteLocked: gemischte Runde → Gate gesperrt → Button disabled, onComplete feuert NICHT.
const lockedSpy = fn()
export const Interaction_CompleteLocked = {
  render: wrap,
  args: { issues, sprintKey: 'DD#1', round: 2, onComplete: lockedSpy },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    lockedSpy.mockClear()
    const btn = c.getByRole('button', { name: 'Review abschließen' })
    // Gate: nicht alle Issues abgenommen → Button disabled (kein onComplete möglich).
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(lockedSpy).not.toHaveBeenCalled()
  },
}

// Connected Demo-Wrapper (I01-Referenz-Template, KEIN Produktionscode): hält issues +
// per-Issue-Reviews lokal und verdrahtet den Verdict-Submit des ReviewStep zurück in den
// Listen-/Gate-Zustand. Belegt die ORCHESTRIERUNG (Verdict→review_status→Gate + History-
// Projektion), nicht die echte Persistenz — die lebt im connected ReviewVerdict/Backend.
function ReviewFlowConnected({ initialIssues, onComplete }) {
  const [issues, setIssues] = useState(initialIssues)
  const [selectedKey, setSelectedKey] = useState(
    initialIssues.find((i) => i.review_status !== 'passed' && i.review_status !== 'cancelled')?.key,
  )
  const [comment, setComment] = useState('')
  const [reviewsByKey, setReviewsByKey] = useState({})
  const onSubmit = (verdict) => {
    const status = verdict === 'pass' ? 'passed' : 'rejected'
    const round = { id: `rnd-${selectedKey}`, review_status: status, notes: comment || 'Abgenommen.' }
    setIssues((prev) => prev.map((i) => (i.key === selectedKey ? { ...i, review_status: status } : i)))
    setReviewsByKey((prev) => ({ ...prev, [selectedKey]: [round, ...(prev[selectedKey] || [])] }))
    setComment('')
  }
  // #8 (D01): per-US-Verdict toggelt us_verdict im selektierten Issue — ENTKOPPELT vom
  // Issue-review_status (kein Auto-Derive). Belegt die Orchestrierung (key→Story-State).
  const onUsVerdict = (usKey, verdict) => {
    setIssues((prev) => prev.map((i) => (
      i.key === selectedKey
        ? { ...i, user_stories: (i.user_stories || []).map((s) => (s.key === usKey ? { ...s, verdict } : s)) }
        : i
    )))
  }
  return (
    <div data-ui="feature.review-flow.interaction-verdict-unlocks" className="h-[720px]">
      <ReviewFlow
        issues={issues}
        sprintKey="DD#1"
        round={2}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        onComplete={onComplete}
        stepProps={{ comment, onComment: setComment, onSubmit, onUsVerdict, reviews: reviewsByKey[selectedKey] || [] }}
      />
    </div>
  )
}

// Interaction_VerdictUnlocks (PO-Runde): letzte offene Bewertung abgeben → Issue wird passed →
// (1) History projiziert die Runde (Empty weg, count 0→1) UND (2) das Complete-Gate entsperrt.
const unlockSpy = fn()
const unlockIssues = [
  { ...fixture, key: 'DD-7', title: 'Multi-Tenant Projekt-Switcher', review_status: 'pending', user_stories: us },
  { key: 'DD-8', title: 'Volltextsuche im Backlog', goal: 'Schnellfilter über key+title.', review_status: 'passed', user_stories: us },
  { key: 'DD-9', title: 'Sort nach Verdict', goal: 'Offene zuerst.', review_status: 'passed', user_stories: us },
]
export const Interaction_VerdictUnlocks = {
  render: () => <ReviewFlowConnected initialIssues={unlockIssues} onComplete={unlockSpy} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const stepEl = () => canvasElement.querySelector('[data-ui="review-step"]')
    unlockSpy.mockClear()
    // Start: letzte offene Bewertung (DD-7) selektiert, noch keine Runde, Gate gesperrt.
    await waitFor(() => expect(stepEl().textContent).toContain('Multi-Tenant Projekt-Switcher'))
    expect(within(stepEl()).getByText('Noch keine Reviews')).toBeInTheDocument()
    expect(within(stepEl()).getByText(/Review-Runden \(0\)/)).toBeInTheDocument()
    expect(c.getByRole('button', { name: 'Review abschließen' })).toBeDisabled()
    // #8 (D01-Klärung id632): per-US accept ist IM Review verfügbar (NICHT read-only) UND
    // ENTKOPPELT vom Issue-Verdict. US-1 akzeptieren → Progress 0/2→1/2, Gate bleibt gesperrt
    // (Issue-review_status wird NICHT aus den US abgeleitet).
    expect(within(stepEl()).getByText(/0\/2 akzeptiert/)).toBeInTheDocument()
    const acceptUs1 = stepEl().querySelector('[data-ui="user-stories.item-US-1.accept"]')
    expect(acceptUs1).toBeTruthy()
    await userEvent.click(acceptUs1)
    await waitFor(() => expect(within(stepEl()).getByText(/1\/2 akzeptiert/)).toBeInTheDocument())
    expect(c.getByRole('button', { name: 'Review abschließen' })).toBeDisabled()
    // Bewertung abgeben: "Abnehmen" (pass braucht kein Feedback).
    await userEvent.click(within(stepEl()).getByRole('button', { name: 'Abnehmen' }))
    // (1) History-Projektion: Empty weg, count 0→1.
    await waitFor(() => expect(within(stepEl()).getByText(/Review-Runden \(1\)/)).toBeInTheDocument())
    expect(within(stepEl()).queryByText('Noch keine Reviews')).toBeNull()
    // (2) Gate entsperrt → abschließen feuert onComplete.
    await waitFor(() => expect(c.getByRole('button', { name: 'Review abschließen' })).toBeEnabled())
    await userEvent.click(c.getByRole('button', { name: 'Review abschließen' }))
    await waitFor(() => expect(unlockSpy).toHaveBeenCalledTimes(1))
  },
}
