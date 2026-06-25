/**
 * GF-2 B2 — MilestoneForm V2 (06.70 Forms & Criteria). Harvest aus MilestoneForm
 * (chrome 'page' inline | 'modal' via Modal-Molecule mit zentralem Focus-Trap, W0-T15).
 * Felder name/description/target_date/(deferred, edit-only). Präsentational:
 * onSubmit(values). Stories nutzen chrome='page' für Inline-Render (Self-QA ohne Overlay).
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import MilestoneForm from '../../../components/ui/organisms/MilestoneForm.jsx'

const noop = () => {}
const ENDPOINT = '/api/milestones'

// Ebene-2 connected Wrapper: macht aus der präsentationalen MilestoneForm einen echten
// Roundtrip gegen /api/milestones — POST (create) bzw. PUT /:id (edit, via values.isEdit).
// MSW fängt den Request → die play-Function assertet den Payload (welches Feld speichert WAS,
// Create- vs Update-Shape) UND die responsegetriebene UI (saving → Gespeichert bzw. Fehler).
// Referenz-Muster: 01.40-backend-contract/MswSavePattern.stories.jsx.
function MilestoneFormConnected({ rootUi, milestone = null }) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saved | error
  const onSubmit = async (values) => {
    setSaving(true)
    setStatus('idle')
    try {
      const url = values.isEdit ? `${ENDPOINT}/${values.id}` : ENDPOINT
      const res = await fetch(url, {
        method: values.isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          target_date: values.target_date,
        }),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div data-ui={rootUi} className="max-w-md">
      <MilestoneForm chrome="page" milestone={milestone} saving={saving} onSubmit={onSubmit} onCancel={noop} />
      {status === 'saved' && (
        <p data-ui={`${rootUi}.success`} className="mt-2 text-sm text-[var(--green)]">Gespeichert</p>
      )}
      {status === 'error' && (
        <p data-ui={`${rootUi}.fail`} className="mt-2 text-sm text-[var(--red)]">Speichern fehlgeschlagen</p>
      )}
    </div>
  )
}

const MILESTONE = {
  id: 7, name: 'Foundation', description: 'Atom/Molekül/Organism-Fundus + EntityDetail-Shell.',
  target_date: '2026-07-01', deferred: false,
}

const meta = {
  title: '06 FEATURES/06.70 Forms & Criteria/MilestoneForm',
  component: MilestoneForm,
  tags: ['status:stable', 'qa_behavioral:done', 'design_version:v2', 'domain:milestone'],
  parameters: { layout: 'padded' },
}
export default meta

// Default (BaseStory): Create-Mode, leer (Root-Minimal), inline page-chrome.
export const Default = {
  render: () => (
    <div data-ui="organism.milestone-form.default" className="max-w-md">
      <MilestoneForm chrome="page" />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Create, inline.
export const Main = {
  render: () => (
    <div data-ui="organism.milestone-form.main" className="max-w-md">
      <MilestoneForm chrome="page" onSubmit={noop} onCancel={noop} />
    </div>
  ),
}

// State_Editing: Edit-Mode mit Prefill — zeigt zusätzlich die Defer-Toggle-Zeile.
export const State_Editing = {
  render: () => (
    <div data-ui="organism.milestone-form.editing" className="max-w-md">
      <MilestoneForm chrome="page" milestone={MILESTONE} onSubmit={noop} onCancel={noop} />
    </div>
  ),
}

// State_Saving: Submit in-flight → Trigger disabled + Spinner.
export const State_Saving = {
  render: () => (
    <div data-ui="organism.milestone-form.saving" className="max-w-md">
      <MilestoneForm chrome="page" milestone={MILESTONE} saving onSubmit={noop} onCancel={noop} />
    </div>
  ),
}

// State_Error: extern gemeldeter Fehlertext (gehoben).
export const State_Error = {
  render: () => (
    <div data-ui="organism.milestone-form.error" className="max-w-md">
      <MilestoneForm chrome="page" error="Name bereits vergeben." onSubmit={noop} onCancel={noop} />
    </div>
  ),
}

// ── Ebene-2 (Behavioral-Roundtrip, MSW) ───────────────────────────────────────

// Interaction_Save: Create-Submit → MSW fängt POST /api/milestones → assert Payload + Success-UI.
const saveSpy = fn()
export const Interaction_Save = {
  render: () => <MilestoneFormConnected rootUi="organism.milestone-form.save" />,
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
    // Name = Pflichtfeld + Submit-Guard (Button bis dahin disabled). Selektor: getByLabelText
    // (B01: Label↔Input via htmlFor/id gekoppelt → kanonischer role-/label-basierter Selektor).
    await userEvent.type(c.getByLabelText(/name/i), 'Beta-Launch')
    await userEvent.click(c.getByRole('button', { name: /erstellen/i }))
    // Ebene-2-Kern: WAS wird gespeichert? → exakter Request-Payload (Create-Shape).
    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith({ name: 'Beta-Launch', description: null, target_date: null }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_SaveError: Backend 500 → Fehler-Orchestrierung der UI.
export const Interaction_SaveError = {
  render: () => <MilestoneFormConnected rootUi="organism.milestone-form.save-error" />,
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
    await userEvent.click(c.getByRole('button', { name: /erstellen/i }))
    await waitFor(() => expect(c.getByText('Speichern fehlgeschlagen')).toBeInTheDocument())
  },
}

// Interaction_EditSave (Q01-Bar): Edit-Mode → MSW fängt PUT /api/milestones/:id → assert
// Update-Payload (divergiert von Create: anderer Endpunkt/Methode, Prefill-getragene Felder).
const editSpy = fn()
export const Interaction_EditSave = {
  render: () => <MilestoneFormConnected rootUi="organism.milestone-form.edit-save" milestone={MILESTONE} />,
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
    // Edit: Prefill ('Foundation') ändern; description/target_date bleiben Prefill-getragen.
    const nameInput = c.getByLabelText(/name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Foundation v2')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    // Ebene-2-Kern Edit: PUT auf :id + Update-Shape (geänderter Name + Prefill-Rest).
    await waitFor(() => expect(editSpy).toHaveBeenCalledWith({
      id: String(MILESTONE.id),
      body: { name: 'Foundation v2', description: MILESTONE.description, target_date: MILESTONE.target_date },
    }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}
