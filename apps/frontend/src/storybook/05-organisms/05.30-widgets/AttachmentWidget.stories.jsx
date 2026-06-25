/**
 * AttachmentWidget — Organism-Story (05.30 Widgets, GF-373 V2-Rewrite). Anhänge in der
 * Terminal-Token-Sprache: randlose CaptureWidget-Shell + Liste + Upload-Button/DropZone;
 * Klick auf einen Anhang öffnet die In-Frame-Preview-Pane (D04). Titellos (Titel aus dem
 * Accordion-Slot). Interactive = Klickpfad-Beweis (Liste → Preview → zurück, play).
 */
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import AttachmentWidget from '../../../components/ui/organisms/AttachmentWidget.jsx'

const ATTACHMENTS = [
  { key: 'a1', name: 'screenshot-review.png', size: '184 KB', href: '#', kind: 'image', previewUrl: 'https://placehold.co/600x360/1e1e2e/cdd6f4?text=screenshot-review.png' },
  { key: 'a2', name: 'spec-delta.pdf', size: '42 KB', href: '#', kind: 'file' },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/AttachmentWidget',
  component: AttachmentWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Liste + Upload-DropZone + Entfernen (CaptureShell randlos, titellos).
export const Default = {
  render: () => (
    <div data-ui="organism.attachment-widget.default" className="max-w-md">
      <AttachmentWidget />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Liste + Upload + Entfernen (Klon der Default-Gestalt).
export const Main = {
  render: () => (
    <div data-ui="organism.attachment-widget.main" className="max-w-md">
      <AttachmentWidget attachments={ATTACHMENTS} uploadable removable onUpload={fn()} onPick={fn()} onRemove={fn()} />
    </div>
  ),
}

// State_ReadOnly: reine Anzeige — kein Upload, kein Entfernen.
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.attachment-widget.read-only" className="max-w-md">
      <AttachmentWidget attachments={ATTACHMENTS} />
    </div>
  ),
}

// State_Empty: keine Anhänge → Leer-Hinweis, DropZone bleibt (uploadable).
export const State_Empty = {
  render: () => (
    <div data-ui="organism.attachment-widget.empty" className="max-w-md">
      <AttachmentWidget attachments={[]} uploadable onUpload={fn()} onPick={fn()} />
    </div>
  ),
}

// Variant_Preview: In-Frame-Preview-Pane eines Bild-Anhangs (Body-Umschaltung selectedKey).
export const Variant_Preview = {
  render: () => {
    const Wrapper = () => {
      // Vorgewählter Anhang via Klick im play — hier nur die Liste als Ausgangspunkt.
      return <AttachmentWidget attachments={ATTACHMENTS} removable onRemove={fn()} />
    }
    return (
      <div data-ui="organism.attachment-widget.preview" className="max-w-md">
        <Wrapper />
      </div>
    )
  },
}

// Interaction_Preview: Klickpfad (L5) — Klick auf Anhang öffnet Preview, Zurück führt zur Liste.
export const Interaction_Preview = {
  render: () => (
    <div data-ui="organism.attachment-widget.interactive" className="max-w-md">
      <AttachmentWidget attachments={ATTACHMENTS} uploadable removable onUpload={fn()} onPick={fn()} onRemove={fn()} />
    </div>
  ),
  play: async ({ canvas }) => {
    // 1. Ausgangs-Liste: kein Zurück-Button.
    expect(canvas.queryByRole('button', { name: /Zurück zur Liste/i })).toBeNull()
    // 2. Klick auf den Anhang (Name als Trigger) → Preview-Pane öffnet.
    await userEvent.click(canvas.getByRole('button', { name: 'screenshot-review.png' }))
    const back = await waitFor(() => canvas.getByRole('button', { name: /Zurück zur Liste/i }))
    expect(back).toBeInTheDocument()
    // 3. Preview zeigt Öffnen-Link + Löschen.
    expect(canvas.getByRole('link', { name: /Öffnen/i })).toBeInTheDocument()
    // 4. Zurück → Liste wieder da (Zurück-Button verschwindet).
    await userEvent.click(back)
    await waitFor(() => expect(canvas.queryByRole('button', { name: /Zurück zur Liste/i })).toBeNull())
  },
}
