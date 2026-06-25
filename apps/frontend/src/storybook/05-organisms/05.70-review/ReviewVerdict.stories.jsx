/**
 * GF-2 T6 — ReviewVerdict (05.70 Review). Binäre Verdict-Abgabe (pass/reject, D01 — kein
 * pending-Button). Reject erfordert verbindlich ein Feedback (canSubmit blockt sonst Submit).
 * PO-Notizen (MarkdownField) + Screenshots (AttachmentDropzone) gehören zur Abgabe.
 *
 * WIRKSAME Props (B04/B05): die Komponente liest KEIN `verdict`-Prop. Die real
 * gerenderten Zustände hängen an `comment` (→ rejectReady + Pflicht-Hinweis),
 * `submitting` (→ Buttons loading), `disabled` (→ Buttons/Feld gesperrt), `onEdit`
 * (→ Bearbeiten-Button) und `attachments`/`onRemoveAttachment` (→ Vorschau-Galerie).
 * Jede Story manifestiert genau einen davon distinct — kein no-op-Prop mehr.
 */
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import ReviewVerdict from '../../../components/ui/organisms/review/ReviewVerdict.jsx'

const meta = {
  title: '05 ORGANISMS/05.70 Review/ReviewVerdict',
  component: ReviewVerdict,
  tags: ['status:stable', 'qa_checklist:done', 'qa_behavioral:open', 'domain:review', 'design_version:v1'],
  parameters: { layout: 'padded' },
}
export default meta

const wrap = (args, ctx) => (
  <div data-ui={`organism.review-verdict.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`} className="max-w-xl">
    <ReviewVerdict {...args} />
  </div>
)

const attachment = [{ id: 'a1', preview: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', caption: 'screenshot.png' }]

// Default: Root-Minimal (kein Feedback) — Ablehnen gesperrt, Pflicht-Hinweis sichtbar,
// kein Bearbeiten-Button, leere Dropzone. canSubmit({reject,''}) === false.
export const Default = { render: wrap, args: {} }

// State_Editing: Feedback wird gerade getippt → Ablehnen freigegeben, Pflicht-Hinweis weg.
// Kein Bearbeiten, keine Anhänge (distinkt zu Main).
export const State_Editing = {
  render: wrap,
  args: { comment: 'US-2 fehlt noch — Edge-Case bei leerem Sprint.', onComment: fn(), onSubmit: fn() },
}

// State_Saving: Abgabe läuft → beide Buttons zeigen loading + sind gesperrt (submitting).
export const State_Saving = {
  render: wrap,
  args: { comment: 'Abgenommen — alle US erfüllt.', submitting: true, onSubmit: fn() },
}

// State_Disabled: read-only (Runde bereits übermittelt) → Buttons + MarkdownField gesperrt,
// KEIN loading-Spinner (distinkt zu State_Saving).
export const State_Disabled = {
  render: wrap,
  args: { comment: 'Abgenommen — alle US erfüllt.', disabled: true },
}

// Variant_MobileProgressive (#12): Mobile-Thumb-Zone — Initial nur Buttons; reject enthüllt
// Feedback-Feld + 'Ablehnung absenden'/'Abbrechen'. passed sendet sofort.
export const Variant_MobileProgressive = {
  render: wrap,
  args: { progressive: true, onSubmit: fn(), onComment: fn() },
}

// Interaction_RejectReveal (#12): "Ablehnen" enthüllt das Feedback-Feld + absenden/abbrechen;
// "Abbrechen" klappt wieder auf die reine Button-Zeile zurück.
export const Interaction_RejectReveal = {
  render: wrap,
  args: { progressive: true, onSubmit: fn(), onComment: fn() },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    // Initial: kein Feedback-Feld.
    expect(canvasElement.querySelector('[data-ui="markdown-field"]')).toBeNull()
    await userEvent.click(c.getByRole('button', { name: 'Ablehnen' }))
    // Enthüllt: Feedback-Feld + absenden + abbrechen.
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="markdown-field"]')).toBeTruthy())
    expect(c.getByRole('button', { name: 'Ablehnung absenden' })).toBeInTheDocument()
    await userEvent.click(c.getByRole('button', { name: 'Abbrechen' }))
    // Zurück auf reine Buttons.
    await waitFor(() => expect(canvasElement.querySelector('[data-ui="markdown-field"]')).toBeNull())
  },
}

// Hauptfall (Gate gf-tier-story-names: Main Pflicht) — vollständige Abgabe: Feedback erfasst
// (Ablehnen frei, kein Hinweis), Bearbeiten-Button da, ein Screenshot in der Galerie.
export const Main = {
  render: wrap,
  args: {
    comment: 'Abgenommen — alle User Stories erfüllt, Edge-Cases geprüft.',
    onEdit: fn(),
    onSubmit: fn(),
    onComment: fn(),
    attachments: attachment,
    onRemoveAttachment: fn(),
  },
}
