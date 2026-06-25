/**
 * UserStoryForm — Organism-Story (05.60 Overlay, GF-T4.5/PO-#4.5). UserStory-Erfass-/
 * Bearbeiten-Form, komponiert ChecklistFormBase. Create = nur Titel-Input (Erfassen via
 * Plus-IconButton im UserStoriesWidget); Edit = Titel-Input + Verdikt-Radiogroup
 * (Offen/Akzeptiert/Abgelehnt, vorbefüllt aus story.verdict). Terminal-Mono, token-clean.
 *
 * Ebene-2 (Behavioral-Roundtrip, MSW): der connected Wrapper bindet die präsentationale Form
 * an den REALEN E01-Vertrag — create POST /api/backlog/:id/user-stories {title}; edit PATCH
 * /api/user-stories/:id {title, us_verdict}. KERN-Assertion: die View mappt das widget-facing
 * Feld `verdict` → Backend-`us_verdict` an der Datengrenze (Backend-B02). create/edit divergieren
 * (anderer Endpunkt/Methode/Payload) → je eine Richtung (Interaction_Save + _EditSave). Referenz:
 * 06.70-forms-criteria/SprintForm (Ebene-2-Vorbild).
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import UserStoryForm from '../../../components/ui/organisms/UserStoryForm.jsx'

const noop = () => {}
const ISSUE_ID = 4101
const CREATE_ENDPOINT = `/api/backlog/${ISSUE_ID}/user-stories`
const ITEM_ENDPOINT = '/api/user-stories'
const STORY = { key: 'US-1', title: 'Tastatur-Navigation der Issue-Liste', verdict: 'accepted' }

// Ebene-2 connected Wrapper: macht aus der präsentationalen UserStoryForm einen echten
// fetch-Roundtrip gegen die E01-Endpunkte. create → POST {title}; edit → PATCH {title,
// us_verdict} (verdict→us_verdict an der Datengrenze, Backend-B02). MSW fängt den Request →
// die play-Function assertet Payload UND die responsegetriebene UI (saved / error).
function UserStoryFormConnected({ rootUi, variant = 'create', story }) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saved | error
  const submit = async (method, url, body) => {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }
  const onCreate = ({ title }) => submit('POST', CREATE_ENDPOINT, { title })
  // Datengrenze (Backend-B02): widget `verdict` → backend `us_verdict`.
  const onPatch = ({ title, verdict }) => submit('PATCH', `${ITEM_ENDPOINT}/${story.key.replace(/^US-/, '')}`, { title, us_verdict: verdict })
  return (
    <div data-ui={rootUi}>
      <UserStoryForm open variant={variant} story={story} saving={saving} onClose={noop} onCreate={onCreate} onPatch={onPatch} />
      {status === 'saved' && (
        <p data-ui={`${rootUi}.success`} className="mt-2 text-sm text-[var(--green)]">Gespeichert</p>
      )}
      {status === 'error' && (
        <p data-ui={`${rootUi}.fail`} className="mt-2 text-sm text-[var(--red)]">Speichern fehlgeschlagen</p>
      )}
    </div>
  )
}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/UserStoryForm',
  component: UserStoryForm,
  tags: ['status:stable', 'qa_behavioral:done', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Default (create): leeres Form, nur Titel-Input (kein Verdikt-Control).
export const Default = {
  render: () => (
    <div data-ui="organism.user-story-form.create">
      <UserStoryForm open variant="create" onClose={noop} onCreate={noop} />
    </div>
  ),
}

// Main (edit): vorbefüllt aus einer Story — Titel + Verdikt-Radiogroup (akzeptiert aktiv).
export const Main = {
  render: () => (
    <div data-ui="organism.user-story-form.edit">
      <UserStoryForm open variant="edit" onClose={noop} onPatch={noop} story={STORY} />
    </div>
  ),
}

// State_Saving: Submit in-flight → Save-Trigger disabled + Loading-Label.
export const State_Saving = {
  render: () => (
    <div data-ui="organism.user-story-form.saving">
      <UserStoryForm open variant="edit" onClose={noop} onPatch={noop} story={STORY} saving />
    </div>
  ),
}

// ── Ebene-2 (Behavioral-Roundtrip, MSW) ───────────────────────────────────────

// Interaction_Save: Create-Submit → MSW fängt POST /api/backlog/:id/user-stories → assert
// Payload {title} (create trägt NUR title — us_verdict defaultet open in der Lib) + Success-UI.
const createSpy = fn()
export const Interaction_Save = {
  render: () => <UserStoryFormConnected rootUi="organism.user-story-form.save" variant="create" />,
  parameters: {
    msw: {
      handlers: [
        http.post(CREATE_ENDPOINT, async ({ request }) => {
          const body = await request.json()
          createSpy(body)
          return HttpResponse.json({ id: 7, key: 'US-7', us_verdict: 'open', ...body }, { status: 201 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    createSpy.mockClear()
    // Titel = Pflichtfeld (Save-Guard via saveDisabled). Selektor: getByRole textbox
    // (LL: headerLabel ≠ input-aria-label, aber role/name ist der robuste Selektor).
    await userEvent.type(c.getByRole('textbox', { name: /user-story-titel/i }), 'Als PO filtere ich die Liste')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    // Ebene-2-Kern create: Payload trägt nur {title} (kein verdict beim Anlegen).
    await waitFor(() => expect(createSpy).toHaveBeenCalledWith({ title: 'Als PO filtere ich die Liste' }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_SaveError: Backend 500 → Fehler-Orchestrierung der UI.
export const Interaction_SaveError = {
  render: () => <UserStoryFormConnected rootUi="organism.user-story-form.save-error" variant="create" />,
  parameters: {
    msw: {
      handlers: [
        http.post(CREATE_ENDPOINT, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.type(c.getByRole('textbox', { name: /user-story-titel/i }), 'x')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    await waitFor(() => expect(c.getByText('Speichern fehlgeschlagen')).toBeInTheDocument())
  },
}

// Interaction_EditSave (Q01-Bar, divergente Richtung): Edit-Mode → Verdikt umschalten
// (accepted → rejected via Radio) → MSW fängt PATCH /api/user-stories/:id → assert Payload.
// KERN: View mappt widget-`verdict` → Backend-`us_verdict` (Backend-B02 Datengrenze); anderer
// Endpunkt/Methode/Shape als create. Genau diese Divergenz pinnt der Test.
const patchSpy = fn()
export const Interaction_EditSave = {
  render: () => <UserStoryFormConnected rootUi="organism.user-story-form.edit-save" variant="edit" story={STORY} />,
  parameters: {
    msw: {
      handlers: [
        http.patch(`${ITEM_ENDPOINT}/:id`, async ({ request, params }) => {
          const body = await request.json()
          patchSpy({ id: params.id, body })
          return HttpResponse.json({ id: Number(params.id), key: `US-${params.id}`, ...body }, { status: 200 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    patchSpy.mockClear()
    // Verdikt von accepted → rejected umschalten (Radio-Klick), Titel-Prefill beibehalten.
    await userEvent.click(c.getByRole('radio', { name: /abgelehnt/i }))
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    // Ebene-2-Kern edit: PATCH auf US-id + Mapping verdict→us_verdict (rejected).
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith({
      id: '1',
      body: { title: STORY.title, us_verdict: 'rejected' },
    }))
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}
