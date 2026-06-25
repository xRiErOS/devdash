/**
 * DefinitionOfDoneWidget — Organism-Story (05.30 Widgets, V2-Rewrite D09). Titellose DoD-
 * Checkliste: komponiert CaptureWidget (randlos) + DoDItem-Zeilen + Erfassen-Button +
 * Fortschritts-Metrik. Erfassen/Detail öffnen DefinitionOfDoneForm. Titel kommt aus dem
 * Accordion-Slot (D02), nicht aus dem Widget.
 *
 * Interactive: Klickpfad-Beweis (Req 5) — Klick auf Erfassen öffnet das Modal (play).
 */
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import DefinitionOfDoneWidget from '../../../components/ui/organisms/DefinitionOfDoneWidget.jsx'

const ITEMS = [
  { id: 1, label: 'Alle Sprints des Milestones abgeschlossen', done: 1, details: 'Sprint-Reviews abgenommen.' },
  { id: 2, label: 'Akzeptanzkriterien aller Issues erfüllt', done: 0 },
  { id: 3, label: 'Doku + Changelog aktualisiert', done: 0 },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/DefinitionOfDoneWidget',
  component: DefinitionOfDoneWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: minimaler Zustand — Default-Props, keine Demo-Daten.
export const Default = {
  render: () => (
    <div data-ui="organism.dod-widget.default" className="max-w-2xl">
      <DefinitionOfDoneWidget />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — 3 Kriterien (1 erledigt), Fortschritt 1/3 (Klon der Default-Gestalt).
export const Main = {
  render: () => (
    <div data-ui="organism.dod-widget.main" className="max-w-2xl">
      <DefinitionOfDoneWidget items={ITEMS} onToggle={fn()} onCreate={fn()} onPatch={fn()} />
    </div>
  ),
}

// State_Empty: keine Kriterien → Leer-Hinweis, Erfassen weiterhin verfügbar.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.dod-widget.empty" className="max-w-2xl">
      <DefinitionOfDoneWidget items={[]} onCreate={fn()} />
    </div>
  ),
}

// Interaction_Create: Klickpfad (Req 5) — Klick auf Erfassen öffnet das DoD-Modal im Storybook.
export const Interaction_Create = {
  args: { items: ITEMS, onToggle: fn(), onCreate: fn(), onPatch: fn() },
  render: (args) => (
    <div data-ui="organism.dod-widget.interactive" className="max-w-2xl">
      <DefinitionOfDoneWidget {...args} />
    </div>
  ),
  play: async ({ canvas, args }) => {
    // 1. Vor dem Klick: kein Dialog.
    expect(canvas.queryByRole('dialog')).toBeNull()
    // 2. Klick auf den Erfassen-Button im create-Slot.
    await userEvent.click(canvas.getByRole('button', { name: /DoD-Kriterium erfassen/i }))
    // 3. Modal öffnet (create-Modus): Dialog + Kriterium-Feld sichtbar.
    const dialog = await waitFor(() => canvas.getByRole('dialog'))
    expect(dialog).toBeInTheDocument()
    const input = canvas.getByLabelText('DoD-Kriterium')
    // 4. Eingabe + Speichern → onCreate wird mit dem Label aufgerufen.
    await userEvent.type(input, 'Neues Kriterium')
    await userEvent.click(canvas.getByRole('button', { name: /Speichern/i }))
    await waitFor(() => expect(args.onCreate).toHaveBeenCalledWith('Neues Kriterium', undefined))
  },
}
