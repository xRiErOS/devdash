/**
 * GF-253 / GF-337 (V2) — TransitionActionsWidget (05.30 Widgets, OR-18). Lifecycle-
 * Transitions je Entität als Aktions-Buttons. Präsentational: `transitions` +
 * `onTransition(key)` vom Consumer (Backend bleibt Lifecycle-autoritativ).
 *
 * V2-Terminal-Token (In-Place, grill-me D01-D04):
 *  - titellos per Default (`showTitle=false`, D02) — Titel kommt zentral aus dem
 *    EntityDetail-Slot; die BaseStory `Default` togglet ihn (`showTitle`-Control).
 *  - `dataUiScope` parametrierbar (D-parent-scope/CONV-461) — Sub-Anker `${scope}.*`.
 *  - <5 Transitions → Button-Cluster (flex-wrap); >=5 → Select-Field (D04).
 *  - PO-exklusive (Sprint complete, Issue done/passed) disabled + „PO"-Marker (DD-186).
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { expect, userEvent, waitFor, fn } from 'storybook/test'
import TransitionActionsWidget from '../../../components/ui/organisms/TransitionActionsWidget.jsx'

const noop = () => {}

// Echte Lifecycle-Bezeichner (server/lib/lifecycle.js) — keine Phantasie-Keys (GF-312).
// Issue at `to_review` → passed | rejected | planned. Issue ist die umfänglichste
// Achse → auch der args-Default (GF-313). Kein poExclusive/PO-Marker (PO 2026-06-19:
// KI nutzt MCP, nicht das Frontend — DD-186-UI-Guard irrelevant; Backend bleibt Gate).
const ISSUE_TX = [
  { key: 'passed', label: 'Bestanden', variant: 'success' },
  { key: 'rejected', label: 'Abgelehnt', variant: 'danger' },
  { key: 'planned', label: 'Zurück in Sprint', variant: 'secondary' },
]

// Sprint at `review` → completed | active (Reopen).
const SPRINT_TX = [
  { key: 'completed', label: 'Abschließen', variant: 'success' },
  { key: 'active', label: 'Reopen', variant: 'ghost' },
]

// Milestone at `active` → completed | cancelled.
const MILESTONE_TX = [
  { key: 'completed', label: 'Abschließen', variant: 'success' },
  { key: 'cancelled', label: 'Abbrechen', variant: 'ghost' },
]

// Edge-Case (D04): >=5 zulässige Übergänge → Select-Field statt Button-Cluster.
// Selten (z.B. Admin-Achse) — demonstriert die Kompaktierungs-Schwelle.
const MANY_TX = [
  { key: 'refined', label: 'Verfeinert', variant: 'secondary' },
  { key: 'planned', label: 'Geplant', variant: 'secondary' },
  { key: 'active', label: 'Aktiv', variant: 'primary' },
  { key: 'to_review', label: 'Zu Review', variant: 'primary' },
  { key: 'cancelled', label: 'Abbrechen', variant: 'ghost' },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/TransitionActionsWidget',
  component: TransitionActionsWidget,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:done', 'design_version:v2'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    showTitle: { control: 'boolean', description: 'Titel-Zeile anzeigen (false = titellos, Titel aus Slot).' },
    dataUiScope: { control: 'text', description: 'data-ui-Wurzelbereich (Consumer-Parent-Scope, CONV-461).' },
    tone: { control: 'select', options: ['crust', 'mantle', 'base', 'surface0'] },
    bordered: { control: 'boolean' },
  },
  args: {
    title: 'Aktionen',
    showTitle: true,
    transitions: ISSUE_TX,
    dataUiScope: 'transition-actions',
    tone: 'base',
    bordered: false,
  },
}
export default meta

// Default (BaseStory): args-getrieben (autodocs-Primary). showTitle-Control togglet den
// Titel (PO wählt on/off). Zeigt die Issue-Achse (GF-313): passed/rejected PO-Verdicts.
export const Default = {
  render: (args) => (
    <div data-ui="organism.transition-actions.default" className="max-w-md">
      <TransitionActionsWidget {...args} onTransition={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — titellos (Slot-Einbettung), Issue at `to_review` →
// passed/rejected (PO-Verdict) + planned (frei). <5 Transitions → Button-Cluster.
export const Main = {
  render: () => (
    <div data-ui="organism.transition-actions.at-issue" className="max-w-md">
      <TransitionActionsWidget transitions={ISSUE_TX} onTransition={noop} />
    </div>
  ),
}

// Variant_AtSprint: titellos — Sprint at `review` → completed PO-exklusiv (disabled + PO-Marker) + Reopen.
export const Variant_AtSprint = {
  render: () => (
    <div data-ui="organism.transition-actions.at-sprint" className="max-w-md">
      <TransitionActionsWidget transitions={SPRINT_TX} onTransition={noop} />
    </div>
  ),
}

// Variant_AtMilestone: titellos — Milestone at `active` → completed PO-exklusiv + Abbrechen.
export const Variant_AtMilestone = {
  render: () => (
    <div data-ui="organism.transition-actions.at-milestone" className="max-w-md">
      <TransitionActionsWidget transitions={MILESTONE_TX} onTransition={noop} />
    </div>
  ),
}

// State_Empty: keine zulässigen Übergänge → Leer-Hinweis statt Buttons (z.B. Issue at `done`).
export const State_Empty = {
  render: () => (
    <div data-ui="organism.transition-actions.empty" className="max-w-md">
      <TransitionActionsWidget transitions={[]} />
    </div>
  ),
}

// Variant_ManyTransitions (D04 Edge-Case): >=5 Übergänge → Select-Field statt Button-Cluster.
export const Variant_ManyTransitions = {
  render: () => (
    <div data-ui="organism.transition-actions.many" className="max-w-md">
      <TransitionActionsWidget title="Issue · viele Übergänge" showTitle transitions={MANY_TX} onTransition={noop} />
    </div>
  ),
}

// Variant_Scoped: Consumer übergibt eigenen Parent-Scope (CONV-461) — Sub-Anker werden abgeleitet.
export const Variant_Scoped = {
  render: () => (
    <div data-ui="organism.transition-actions.scoped" className="max-w-md">
      <TransitionActionsWidget transitions={ISSUE_TX} onTransition={noop} dataUiScope="entity-detail.slot.transitions" />
    </div>
  ),
}

// Walk (Gleis 2): dynamischer Transition-Walk. useState hält `current`, Klick advanced
// den Status entlang der Kette und recomputed die verfügbaren Übergänge — zeigt das
// Kernverhalten „nur tatsächlich mögliche Transitions". play klickt einen freien
// Übergang und asserted, dass sich der Button-Satz ändert.
const WALK = {
  planned: [{ key: 'active', label: 'Aktivieren', variant: 'primary' }],
  active: [{ key: 'to_review', label: 'Zu Review', variant: 'primary' }],
  to_review: [
    { key: 'passed', label: 'Bestanden', variant: 'success' },
    { key: 'rejected', label: 'Abgelehnt', variant: 'danger' },
  ],
  rejected: [{ key: 'planned', label: 'Zurück in Sprint', variant: 'secondary' }],
  passed: [],
}

function WalkWidget() {
  const [current, setCurrent] = useState('planned')
  return (
    <div data-ui="organism.transition-actions.walk" className="max-w-md">
      <TransitionActionsWidget
        showTitle
        title={`Issue · ${current}`}
        transitions={WALK[current] || []}
        onTransition={(key) => setCurrent(key)}
      />
    </div>
  )
}

export const Interaction_Walk = {
  render: () => <WalkWidget />,
  play: async ({ canvasElement }) => {
    // Start: planned → genau ein freier Übergang „Aktivieren".
    const activate = await waitFor(() =>
      canvasElement.querySelector('[data-ui="transition-actions.action-active"]'),
    )
    expect(activate).toBeTruthy()
    await userEvent.click(activate)
    // Nach Klick: current=active → Button-Satz wechselt auf „Zu Review".
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-ui="transition-actions.action-to_review"]')).toBeTruthy(),
    )
    expect(canvasElement.querySelector('[data-ui="transition-actions.action-active"]')).toBeNull()
  },
}

// ── Ebene-2 (connected + MSW): „welcher Button speichert WAS" ──────────────────
// onTransition(key) wird auf einen echten fetch-POST gemappt; MSW fängt ab, die play
// assertet den REQUEST-PAYLOAD (nicht nur, DASS der Callback feuert) + die response-
// getriebene UI. Muster: src/storybook/01-foundations/01.40-backend-contract/MswSavePattern.
// (SB ≥8.2: play() resettet+applied parameters.msw.handlers automatisch → Story-Isolation.)
const TX_ENDPOINT = '/api/issues/DD-7/transition'
const txSaveSpy = fn()

function ConnectedTransition({ rootUi = 'organism.transition-actions.connected' }) {
  const [status, setStatus] = useState('to_review')
  const [phase, setPhase] = useState('idle') // idle | saving | error
  const transitions = status === 'to_review' ? ISSUE_TX : []
  const onTransition = async (key) => {
    setPhase('saving')
    try {
      const res = await fetch(TX_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: key }),
      })
      if (!res.ok) { setPhase('error'); return }
      const json = await res.json()
      setStatus(json.status ?? key)
      setPhase('idle')
    } catch {
      setPhase('error')
    }
  }
  return (
    <div data-ui={rootUi} className="flex max-w-md flex-col gap-2">
      <p data-ui="transition-actions.current" className="text-xs text-[var(--subtext0)]">Status: {status}</p>
      <TransitionActionsWidget transitions={transitions} onTransition={onTransition} />
      {phase === 'error' && (
        <p data-ui="transition-actions.error" className="text-sm text-[var(--red)]">Übergang fehlgeschlagen</p>
      )}
    </div>
  )
}

export const Interaction_TransitionSave = {
  render: () => <ConnectedTransition rootUi="organism.transition-actions.connected-save" />,
  parameters: {
    msw: {
      handlers: [
        http.post(TX_ENDPOINT, async ({ request }) => {
          const body = await request.json()
          txSaveSpy(body) // Payload-Capture
          return HttpResponse.json({ ok: true, status: body.to }, { status: 200 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    txSaveSpy.mockClear()
    const btn = await waitFor(() =>
      canvasElement.querySelector('[data-ui="transition-actions.action-passed"]'),
    )
    await userEvent.click(btn)
    // Ebene-2-Kern: WAS wurde gespeichert? → exakter Request-Payload.
    await waitFor(() => expect(txSaveSpy).toHaveBeenCalledWith({ to: 'passed' }))
    // Response-getriebene UI: neuer Status übernommen.
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-ui="transition-actions.current"]')?.textContent).toContain('passed'),
    )
  },
}

export const Interaction_TransitionSaveError = {
  render: () => <ConnectedTransition rootUi="organism.transition-actions.connected-error" />,
  parameters: {
    msw: {
      handlers: [
        http.post(TX_ENDPOINT, () => HttpResponse.json({ error: 'lifecycle' }, { status: 409 })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const btn = await waitFor(() =>
      canvasElement.querySelector('[data-ui="transition-actions.action-passed"]'),
    )
    await userEvent.click(btn)
    // Fehler-Orchestrierung: 409 → Fehler-UI, Status bleibt unverändert.
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-ui="transition-actions.error"]')).toBeTruthy(),
    )
    expect(canvasElement.querySelector('[data-ui="transition-actions.current"]')?.textContent).toContain('to_review')
  },
}
