/**
 * GF-2 A2 (D-I) — SprintForm V2 (06.70 Forms & Criteria). chrome-abstrahierter Refactor
 * aus SprintFormModal: 'page' (inline, EntityDetail-Edit-Slot) | 'modal' (Modal-Molecule
 * mit zentralem Focus-Trap, W0-T15). Präsentational: onSubmit({mode,sprintId,values}).
 * Stories nutzen chrome='page' für Inline-Render (Self-QA ohne Overlay).
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import SprintForm from '../../../components/ui/organisms/SprintForm.jsx'

const noop = () => {}
const ENDPOINT = '/api/sprints'

// Ebene-2 connected Wrapper: macht aus der präsentationalen SprintForm einen echten
// fetch-Roundtrip (POST create / PUT edit) gegen /api/sprints. MSW fängt den Request → die
// play-Function assertet den Payload (welches Feld speichert WAS) UND die responsegetriebene
// UI (submitting → Gespeichert bzw. Fehler). Referenz: 01.40-backend-contract/MswSavePattern.
function SprintFormConnected({ rootUi, ...formProps }) {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saved | error
  const onSubmit = async ({ mode, sprintId, values }) => {
    setSubmitting(true)
    setStatus('idle')
    try {
      const url = mode === 'edit' ? `${ENDPOINT}/${sprintId}` : ENDPOINT
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div data-ui={rootUi} className="max-w-md">
      <SprintForm chrome="page" submitting={submitting} onSubmit={onSubmit} onClose={noop} {...formProps} />
      {status === 'saved' && (
        <p data-ui={`${rootUi}.success`} className="mt-2 text-sm text-[var(--green)]">Gespeichert</p>
      )}
      {status === 'error' && (
        <p data-ui={`${rootUi}.fail`} className="mt-2 text-sm text-[var(--red)]">Speichern fehlgeschlagen</p>
      )}
    </div>
  )
}

const MILESTONES = [
  { id: 1, name: 'M-Core', target_date: '2026-07-01' },
  { id: 2, name: 'M-Polish', target_date: '2026-08-15' },
]

const SPRINT = {
  id: 62, name: 'Tastatur-Layer & Slot-Komposition',
  goal: 'EntityDetail-Slots stabil — Sprint/Milestone teilen den Frame.',
  notes: 'Re-Home 05.70→06.60 zuerst; IssueDetails nach Fix.',
  start_date: '2026-06-16', end_date: '2026-06-27',
  capacity: 24, wip_limit: 4, status: 'active', milestone_id: 1,
  project_prefix: 'DD', project_number: 62,
}

const meta = {
  title: '06 FEATURES/06.70 Forms & Criteria/SprintForm',
  component: SprintForm,
  tags: ['status:stable', 'qa_behavioral:done', 'design_version:v2', 'domain:sprint'],
  parameters: { layout: 'padded' },
}
export default meta

// Default (BaseStory): Create-Mode, leer (Root-Minimal), inline page-chrome.
export const Default = {
  render: () => (
    <div data-ui="organism.sprint-form.default" className="max-w-md">
      <SprintForm chrome="page" onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Create mit Milestone-Optionen, inline.
export const Main = {
  render: () => (
    <div data-ui="organism.sprint-form.main" className="max-w-md">
      <SprintForm chrome="page" mode="create" milestones={MILESTONES} onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// State_Editing: Edit-Mode mit Prefill — zeigt zusätzlich Notizen + Status.
export const State_Editing = {
  render: () => (
    <div data-ui="organism.sprint-form.editing" className="max-w-md">
      <SprintForm chrome="page" mode="edit" sprint={SPRINT} milestones={MILESTONES} onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// State_Saving: Submit in-flight → Trigger disabled + Spinner-Label.
export const State_Saving = {
  render: () => (
    <div data-ui="organism.sprint-form.saving" className="max-w-md">
      <SprintForm chrome="page" mode="edit" sprint={SPRINT} milestones={MILESTONES} submitting onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// State_Error: extern gemeldeter Fehlertext (gehoben).
export const State_Error = {
  render: () => (
    <div data-ui="organism.sprint-form.error" className="max-w-md">
      <SprintForm chrome="page" mode="create" milestones={MILESTONES} error="Name bereits vergeben." onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// ── Ebene-2 (Behavioral-Roundtrip, MSW) ───────────────────────────────────────

// Interaction_Save: Create-Submit → MSW fängt POST /api/sprints → assert Payload + Success-UI.
const saveSpy = fn()
export const Interaction_Save = {
  render: () => <SprintFormConnected rootUi="organism.sprint-form.save" mode="create" milestones={MILESTONES} />,
  parameters: {
    msw: {
      handlers: [
        http.post(ENDPOINT, async ({ request }) => {
          const body = await request.json()
          saveSpy(body) // Payload-Capture für die Assertion
          return HttpResponse.json({ ok: true, id: 99, ...body }, { status: 201 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    saveSpy.mockClear()
    // Name = Pflichtfeld (Submit-Guard via localError). Selektor: getByLabelText
    // (B01: Label↔Input via htmlFor/id gekoppelt → kanonischer Selektor).
    await userEvent.type(c.getByLabelText(/name/i), 'Sprint 21')
    await userEvent.click(c.getByRole('button', { name: /sprint erstellen/i }))
    // Ebene-2-Kern: Create-Payload trägt nur gesetzte Felder (name) — Contract sprintCreateContract.
    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith({ name: 'Sprint 21' }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_SaveError: Backend 500 → Fehler-Orchestrierung der UI.
export const Interaction_SaveError = {
  render: () => <SprintFormConnected rootUi="organism.sprint-form.save-error" mode="create" milestones={MILESTONES} />,
  parameters: {
    msw: {
      handlers: [
        http.post(ENDPOINT, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.type(c.getByLabelText(/name/i), 'x')
    await userEvent.click(c.getByRole('button', { name: /sprint erstellen/i }))
    await waitFor(() => expect(c.getByText('Speichern fehlgeschlagen')).toBeInTheDocument())
  },
}

// Interaction_EditSave (Q01-Bar): Edit-Mode → MSW fängt PUT /api/sprints/:id → assert
// Update-Payload. Divergiert STARK vom Create: voller Felder-Satz (goal/notes/dates/capacity/
// wip_limit/status/milestone_id), anderer Endpunkt/Methode. Genau diese Divergenz pinnt der Test.
const editSpy = fn()
export const Interaction_EditSave = {
  render: () => <SprintFormConnected rootUi="organism.sprint-form.edit-save" mode="edit" sprint={SPRINT} milestones={MILESTONES} />,
  parameters: {
    msw: {
      handlers: [
        http.put(`${ENDPOINT}/:id`, async ({ request, params }) => {
          const body = await request.json()
          editSpy({ id: params.id, body })
          return HttpResponse.json({ ok: true, id: Number(params.id), ...body }, { status: 200 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    editSpy.mockClear()
    // Edit: Name-Prefill ändern; restliche Felder Prefill-getragen → voller Update-Payload.
    const nameInput = c.getByLabelText(/name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Sprint 62 v2')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    // Ebene-2-Kern Edit: PUT auf :id + voller Update-Shape (sprintUpdateContract).
    await waitFor(() => expect(editSpy).toHaveBeenCalledWith({
      id: String(SPRINT.id),
      body: {
        name: 'Sprint 62 v2',
        goal: SPRINT.goal,
        notes: SPRINT.notes,
        start_date: SPRINT.start_date,
        end_date: SPRINT.end_date,
        capacity: SPRINT.capacity,
        wip_limit: SPRINT.wip_limit,
        status: SPRINT.status,
        milestone_id: SPRINT.milestone_id,
      },
    }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}
