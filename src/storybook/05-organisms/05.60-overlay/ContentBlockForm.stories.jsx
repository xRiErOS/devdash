/**
 * ContentBlockForm — Organism-Story (05.60 Overlay). Edit/Update-Form für GENAU EINEN
 * Block eines ContentBlock (D04 rev — PO 2026-06-19): ein Edit-Button öffnet ein Form
 * mit genau einem Feld (dem geklickten Block). Komponiert ChecklistFormBase + ein
 * labeled MarkdownField (note-field). Generisch (rendert die übergebenen `blocks`),
 * kanonisch mit einem Block befüllt.
 *
 * Der Klickpfad EditButton→Form (Req 2) ist in `ContentBlock.stories` (EditFlow, play).
 */
import { fn } from 'storybook/test'
import ContentBlockForm from '../../../components/ui/organisms/ContentBlockForm.jsx'

const GOAL = { key: 'goal', label: 'Goal', value: 'Nutzer kann Issues per Tastatur navigieren — Pfeiltasten bewegen die Auswahl, Enter öffnet das Detail.' }

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/ContentBlockForm',
  component: ContentBlockForm,
  tags: ['status:stable', 'qa_behavioral:open', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Default: Root-Minimal — Form offen, keine Blöcke (Default-Props).
export const Default = {
  render: () => (
    <div data-ui="organism.content-block-form.open">
      <ContentBlockForm open onClose={fn()} blocks={[]} onSave={fn()} />
    </div>
  ),
}

// Main: Form offen, genau ein Feld (Goal) vorbefüllt → ein MarkdownField (Edit/Update).
export const Main = {
  render: () => (
    <div data-ui="organism.content-block-form.main">
      <ContentBlockForm open onClose={fn()} blocks={[GOAL]} focusKey="goal" headerLabel="Goal bearbeiten" onSave={fn()} />
    </div>
  ),
}

// Saving: Submit-in-flight → Save zeigt Loading + ist gesperrt.
export const State_Saving = {
  render: () => (
    <div data-ui="organism.content-block-form.saving">
      <ContentBlockForm open onClose={fn()} blocks={[GOAL]} focusKey="goal" headerLabel="Goal bearbeiten" onSave={fn()} saving />
    </div>
  ),
}
