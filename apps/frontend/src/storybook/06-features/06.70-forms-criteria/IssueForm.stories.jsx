/**
 * GF-2 Backlog-Pane V2 T1 — IssueForm (06.70 Forms & Criteria).
 * xForm-Pattern analog SprintForm: chrome-Abstraktion 'page' (inline, EntityDetail-Edit-Slot)
 * | 'modal' (Modal-Molecule). Präsentational: onSubmit({mode,issueId,values}).
 * D04: Milestone NICHT editierbar (folgt aus Sprint). Stories nutzen chrome='page' für
 * Inline-Render (Self-QA ohne Overlay).
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import IssueForm from '../../../components/ui/organisms/IssueForm.jsx'

const noop = () => {}
const ENDPOINT = '/api/backlog'

// Ebene-2 connected Wrapper: macht aus der präsentationalen IssueForm einen echten
// fetch-Roundtrip (POST create / PUT edit) gegen /api/backlog. MSW fängt den Request.
function IssueFormConnected({ rootUi, ...formProps }) {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saved | error

  const onSubmit = async ({ mode, issueId, values }) => {
    setSubmitting(true)
    setStatus('idle')
    try {
      const url = mode === 'edit' ? `${ENDPOINT}/${issueId}` : ENDPOINT
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
      <IssueForm
        chrome="page"
        submitting={submitting}
        onSubmit={onSubmit}
        onClose={noop}
        {...formProps}
      />
      {status === 'saved' && (
        <p data-ui={`${rootUi}.success`} className="mt-2 text-sm text-[var(--green)]">
          Gespeichert
        </p>
      )}
      {status === 'error' && (
        <p data-ui={`${rootUi}.fail`} className="mt-2 text-sm text-[var(--red)]">
          Speichern fehlgeschlagen
        </p>
      )}
    </div>
  )
}

const SPRINT_OPTIONS = [
  { value: 1, label: 'DD#78 — Backlog-Pane V2' },
  { value: 2, label: 'DD#79 — IssueDetails V2' },
]

const ISSUE = {
  id: 42,
  title: 'IssueForm — xForm-Pattern implementieren',
  type: 'feature',
  priority: 2,
  sprint_id: 1,
  po_notes: 'Analog SprintForm — chrome page|modal, D04 kein Milestone.',
  description: 'Präsentational/controlled, Submit-Payload gegen backlog.contracts.js.',
}

const meta = {
  title: '06 FEATURES/06.70 Forms & Criteria/IssueForm',
  component: IssueForm,
  tags: ['status:review', 'qa_checklist:open', 'design_version:v2', 'domain:backlog'],
  parameters: { layout: 'padded' },
}
export default meta

// ── Ebene-1 (präsentational, renderToStaticMarkup-fähig) ──────────────────────

// Default (BaseStory): Edit-Mode, leer, inline page-chrome.
export const Default = {
  render: () => (
    <div data-ui="organism.issue-form.default" className="max-w-md">
      <IssueForm chrome="page" onSubmit={noop} onClose={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Edit-Mode mit Sprint-Optionen, inline.
export const Main = {
  render: () => (
    <div data-ui="organism.issue-form.main" className="max-w-md">
      <IssueForm
        chrome="page"
        mode="edit"
        issue={ISSUE}
        sprintOptions={SPRINT_OPTIONS}
        onSubmit={noop}
        onClose={noop}
      />
    </div>
  ),
}

// Variant_Page: Create-Mode, chrome=page (EntityDetail-Edit-Slot).
export const Variant_Page = {
  render: () => (
    <div data-ui="organism.issue-form.variant-page" className="max-w-md">
      <IssueForm
        chrome="page"
        mode="create"
        sprintOptions={SPRINT_OPTIONS}
        onSubmit={noop}
        onClose={noop}
      />
    </div>
  ),
}

// State_Saving: Submit in-flight → Button disabled + Spinner-Label.
export const State_Saving = {
  render: () => (
    <div data-ui="organism.issue-form.saving" className="max-w-md">
      <IssueForm
        chrome="page"
        mode="edit"
        issue={ISSUE}
        sprintOptions={SPRINT_OPTIONS}
        submitting
        onSubmit={noop}
        onClose={noop}
      />
    </div>
  ),
}

// State_Error: extern gemeldeter Fehlertext (gehoben).
export const State_Error = {
  render: () => (
    <div data-ui="organism.issue-form.error" className="max-w-md">
      <IssueForm
        chrome="page"
        mode="create"
        error="Titel bereits vergeben."
        onSubmit={noop}
        onClose={noop}
      />
    </div>
  ),
}

// ── Ebene-2 (Behavioral-Roundtrip, MSW) ───────────────────────────────────────

// Interaction_Save: Create-Submit → MSW fängt POST /api/backlog → assert Payload + Success-UI.
const saveSpy = fn()
export const Interaction_Save = {
  render: () => (
    <IssueFormConnected
      rootUi="organism.issue-form.save"
      mode="create"
      sprintOptions={SPRINT_OPTIONS}
    />
  ),
  parameters: {
    msw: {
      handlers: [
        http.post(ENDPOINT, async ({ request }) => {
          const body = await request.json()
          saveSpy(body)
          return HttpResponse.json({ ok: true, id: 99, ...body }, { status: 201 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    saveSpy.mockClear()
    await userEvent.type(c.getByLabelText(/titel/i), 'Neues Issue')
    await userEvent.click(c.getByRole('button', { name: /issue erstellen/i }))
    // Create-Payload trägt nur gesetzte Felder: title + type-Default ('bug', erste ISSUE_TYPES).
    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith({ title: 'Neues Issue', type: 'bug' })
    )
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_EditSave: Edit-Mode → MSW fängt PUT /api/backlog/:id → assert Update-Payload.
const editSpy = fn()
export const Interaction_EditSave = {
  render: () => (
    <IssueFormConnected
      rootUi="organism.issue-form.edit-save"
      mode="edit"
      issue={ISSUE}
      sprintOptions={SPRINT_OPTIONS}
    />
  ),
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
    const titleInput = c.getByLabelText(/titel/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'IssueForm V2 — umbenannt')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    await waitFor(() =>
      expect(editSpy).toHaveBeenCalledWith({
        id: String(ISSUE.id),
        body: expect.objectContaining({ title: 'IssueForm V2 — umbenannt' }),
      })
    )
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_KeyboardSubmit (modal-chrome): Cmd/Ctrl+S löst denselben submit-Pfad wie der
// Button aus (Muster MilestoneForm). Gegenprobe: chrome=page bindet KEINEN document-keydown,
// daher würde Cmd+S dort NICHT auslösen (negativ via separater page-Story belegt).
const keySubmitSpy = fn()
export const Interaction_KeyboardSubmit = {
  render: () => (
    <div data-ui="organism.issue-form.kbd" className="max-w-md">
      <IssueForm
        chrome="modal"
        open
        mode="create"
        sprintOptions={SPRINT_OPTIONS}
        onSubmit={keySubmitSpy}
        onClose={noop}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    keySubmitSpy.mockClear()
    await userEvent.type(c.getByLabelText(/titel/i), 'Per Tastatur gespeichert')
    // Cmd/Ctrl+S → submit (gleicher Pfad wie der Save-Button).
    await userEvent.keyboard('{Meta>}s{/Meta}')
    await waitFor(() =>
      expect(keySubmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'create',
          values: expect.objectContaining({ title: 'Per Tastatur gespeichert' }),
        })
      )
    )
  },
}

// Interaction_PageNoKeyboardSubmit: Gegenprobe — chrome=page bindet KEINEN document-weiten
// keydown-Listener (A11Y-B04), Cmd+S darf onSubmit NICHT auslösen (kein Fremdfeld-Hijack).
const pageKeySpy = fn()
export const Interaction_PageNoKeyboardSubmit = {
  render: () => (
    <div data-ui="organism.issue-form.kbd-page" className="max-w-md">
      <IssueForm
        chrome="page"
        mode="create"
        sprintOptions={SPRINT_OPTIONS}
        onSubmit={pageKeySpy}
        onClose={noop}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    pageKeySpy.mockClear()
    await userEvent.type(c.getByLabelText(/titel/i), 'Kein Tastatur-Submit im page-chrome')
    await userEvent.keyboard('{Meta>}s{/Meta}')
    // Kein document-keydown im page-chrome → onSubmit darf NICHT gefeuert haben.
    await new Promise((r) => setTimeout(r, 50))
    expect(pageKeySpy).not.toHaveBeenCalled()
  },
}
