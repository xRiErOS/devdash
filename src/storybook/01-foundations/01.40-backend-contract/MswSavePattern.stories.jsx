/**
 * CT-Runner-Referenz: MSW-Save-Pattern (chore/test-ct-runner-msw).
 *
 * Beweist die EBENE-2-Behavioral-Tests („welcher Button speichert WAS"): ein connected
 * Demo-Container macht einen echten `fetch`-POST; MSW fängt ihn ab; die `play`-Function
 * assertet den REQUEST-PAYLOAD (nicht nur einen fn()-Spy am Callback) UND die UI-Reaktion
 * (Loading → Success bzw. Error). Self-contained Template — reale Features adoptieren das
 * Muster über `parameters.msw.handlers` + `Interaction_Save`.
 *
 * Abgrenzung Ebene-1 (präsentational + fn()-Spy) testet nur den Callback-Vertrag; erst MSW
 * (Ebene-2) beweist Methode/URL/Payload + responsegetriebene UI. Details: Behavioral-Checkliste.
 */
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import Button from '../../../components/ui/atoms/Button.jsx'
import Input from '../../../components/ui/atoms/Input.jsx'

const ENDPOINT = '/api/demo/memo'

// Connected Demo-Container: hält Draft + fährt den echten Save-Roundtrip gegen ENDPOINT.
// rootUi je Story eindeutig (Parent-Scope, R-I10) → a2-Distinctness-Gate (erster Anker je Export).
function MemoSaver({ rootUi = 'foundation.msw-save' }) {
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const save = async () => {
    setStatus('saving')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    }
  }
  return (
    <div data-ui={rootUi} className="flex max-w-sm flex-col gap-2">
      <Input
        data-ui="foundation.msw-save.note"
        aria-label="Notiz"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz eingeben…"
      />
      <Button
        data-ui="foundation.msw-save.submit"
        variant="primary"
        loading={status === 'saving'}
        disabled={status === 'saving'}
        onClick={save}
      >
        Speichern
      </Button>
      {status === 'saved' && (
        <p data-ui="foundation.msw-save.success" className="text-sm text-[var(--green)]">Gespeichert</p>
      )}
      {status === 'error' && (
        <p data-ui="foundation.msw-save.error" className="text-sm text-[var(--red)]">Speichern fehlgeschlagen</p>
      )}
    </div>
  )
}

const meta = {
  title: '01 FOUNDATIONS/01.40 Backend Contract/MSW Save Pattern',
  component: MemoSaver,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:done'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Idle-Render (kein Roundtrip).
export const Default = { render: () => <MemoSaver rootUi="foundation.msw-save.default" /> }

// Interaction_Save (Ebene-2): MSW fängt POST → assert Payload + Success-UI.
const saveSpy = fn()
export const Interaction_Save = {
  render: () => <MemoSaver rootUi="foundation.msw-save.save" />,
  parameters: {
    msw: {
      handlers: [
        http.post(ENDPOINT, async ({ request }) => {
          const body = await request.json()
          saveSpy(body) // Payload-Capture für die Assertion
          return HttpResponse.json({ ok: true, ...body }, { status: 201 })
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    saveSpy.mockClear()
    await userEvent.type(c.getByLabelText('Notiz'), 'Sprint-Review notiert')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    // Ebene-2-Kern: WAS wurde gespeichert? → exakter Request-Payload.
    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith({ note: 'Sprint-Review notiert' }))
    // Response-getriebene UI-Reaktion.
    await waitFor(() => expect(c.getByText('Gespeichert')).toBeInTheDocument())
  },
}

// Interaction_SaveError (Ebene-2): Backend 500 → Fehler-Orchestrierung der UI.
export const Interaction_SaveError = {
  render: () => <MemoSaver rootUi="foundation.msw-save.save-error" />,
  parameters: {
    msw: {
      handlers: [
        http.post(ENDPOINT, () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.type(c.getByLabelText('Notiz'), 'x')
    await userEvent.click(c.getByRole('button', { name: /speichern/i }))
    await waitFor(() => expect(c.getByText('Speichern fehlgeschlagen')).toBeInTheDocument())
  },
}
