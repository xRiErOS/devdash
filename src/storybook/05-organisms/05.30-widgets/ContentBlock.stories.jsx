/**
 * GF-335 — ContentBlock V2 (W1, 05.30 Widgets). Terminal-Token-Sprache: variable
 * benannte Textblöcke (blocks[], D02), titellos default + heading opt-in (D03), PRO
 * Block ein EditButton (Option A) → öffnet das ContentBlockForm fokussiert auf den
 * geklickten Block (D04). Alle Stories sind LIVE verdrahtet (useState-Wrapper), damit
 * der Klickpfad EditButton→Form im Storybook direkt testbar ist; EditFlow zusätzlich
 * mit play als automatischer Gleis-2-Beweis.
 *
 * data-ui je Story-Wrapper UND je Block (PO spricht jedes 1:1 an).
 */
import { useState } from 'react'
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import ContentBlock from '../../../components/ui/organisms/ContentBlock.jsx'
import ContentBlockForm from '../../../components/ui/organisms/ContentBlockForm.jsx'

const GOAL = 'Nutzer kann Issues per Tastatur navigieren — Pfeiltasten bewegen die Auswahl, Enter öffnet das Detail.'
const BACKGROUND = 'Bestehende Liste hat keine Keyboard-Steuerung; Power-User verlieren Zeit mit der Maus. Linear/Raycast setzen den Standard.'

const BLOCKS = [
  { key: 'goal', label: 'Goal', value: GOAL },
  { key: 'background', label: 'Background', value: BACKGROUND },
]

// Live-Wrapper: pro-Block-EditButton öffnet das Form mit GENAU EINEM Feld — dem
// geklickten Block (D04 rev). Identisches Muster, das der echte EntityDetail-Frame
// komponiert: onEdit(key) → nur diesen Block ans ContentBlockForm reichen.
function LiveContentBlock({ dataUi, blocks, heading }) {
  const [editKey, setEditKey] = useState(null)
  const editBlock = blocks.find((b) => b.key === editKey)
  return (
    <div data-ui={dataUi} className="max-w-2xl">
      <ContentBlock blocks={blocks} heading={heading} onEdit={setEditKey} />
      <ContentBlockForm
        open={editBlock != null}
        focusKey={editKey || undefined}
        blocks={editBlock ? [editBlock] : []}
        headerLabel={editBlock ? `${editBlock.label} bearbeiten` : undefined}
        onClose={() => setEditKey(null)}
        onSave={fn()}
      />
    </div>
  )
}

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/ContentBlock',
  component: ContentBlock,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: titellos, 2 Blöcke, pro Block ein EditButton — Klick öffnet das Form live.
export const Default = {
  render: () => <LiveContentBlock dataUi="organism.content-block.default" blocks={BLOCKS} />,
}

// Main: maßgeblicher Hauptfall — variable Block-Anzahl (Daten-Shape-Beweis, nicht fix goal+background).
export const Main = {
  render: () => (
    <LiveContentBlock
      dataUi="organism.content-block.many"
      blocks={[
        { key: 'goal', label: 'Goal', value: GOAL },
        { key: 'background', label: 'Background', value: BACKGROUND },
        { key: 'acceptance', label: 'Acceptance', value: 'Tastatur-Navigation per Pfeiltasten + Enter; Fokus sichtbar; ESC schließt.' },
        { key: 'notes', label: 'Notes', value: 'Abhängig von der Listen-Refaktorierung in GF-310.' },
      ]}
    />
  ),
}

// Variant_Heading: gleiche Blöcke mit optionaler Widget-Caption (`// Beschreibung`).
export const Variant_Heading = {
  render: () => <LiveContentBlock dataUi="organism.content-block.heading" blocks={BLOCKS} heading="Beschreibung" />,
}

// State_Empty: leere Blöcke → Platzhalter je Block (Erst-Erfassung), EditButton verfügbar.
export const State_Empty = {
  render: () => (
    <LiveContentBlock
      dataUi="organism.content-block.empty"
      blocks={[
        { key: 'goal', label: 'Goal', value: '', placeholder: 'Kein Goal hinterlegt.' },
        { key: 'background', label: 'Background', value: '', placeholder: 'Kein Background hinterlegt.' },
      ]}
    />
  ),
}

// Interaction_Edit (Gleis 2): play beweist den Klickpfad — Klick auf den Goal-EditButton
// öffnet das Form, Goal-Feld (note-field) ist fokussiert/editierbar.
export const Interaction_Edit = {
  render: () => <LiveContentBlock dataUi="organism.content-block.editflow" blocks={BLOCKS} heading="Beschreibung" />,
  play: async ({ canvas, canvasElement }) => {
    // 1. Vor dem Klick: kein Dialog (Form geschlossen).
    expect(canvas.queryByRole('dialog')).toBeNull()
    // 2. Klick auf den EditButton des Goal-Blocks.
    await userEvent.click(canvas.getByRole('button', { name: /Goal bearbeiten/i }))
    // 3. Form öffnet: Dialog + NUR das Goal-Feld (genau ein Feld, D04 rev).
    const dialog = await waitFor(() => canvas.getByRole('dialog'))
    expect(dialog).toBeInTheDocument()
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-ui="content-block-form.field-goal"]')).toBeTruthy(),
    )
    expect(canvasElement.querySelector('[data-ui="content-block-form.field-background"]')).toBeNull()
    // 4. note-field editierbar: CodeMirror-Editor vorhanden + contenteditable.
    const editor = await waitFor(() => {
      const el = canvasElement.querySelector('[data-ui="content-block-form.field-goal"] .cm-content')
      expect(el).toBeTruthy()
      return el
    })
    expect(editor.getAttribute('contenteditable')).toBe('true')
  },
}
