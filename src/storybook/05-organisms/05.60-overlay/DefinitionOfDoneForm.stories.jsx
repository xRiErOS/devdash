/**
 * DefinitionOfDoneForm — Organism-Story (05.60 Overlay). DoD-Erfass-/Bearbeiten-Form,
 * komponiert ChecklistFormBase. Create = leer (Erfassen, Req 3); Edit = vorbefüllt + idTag
 * (dod-item.detail, Req 6). Felder am Schema: Label + Done-Status (D05).
 */
import DefinitionOfDoneForm from '../../../components/ui/organisms/DefinitionOfDoneForm.jsx'

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/DefinitionOfDoneForm',
  component: DefinitionOfDoneForm,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Default: Root-Minimal — leeres Form mit Default-Props (Erfassen via IconButton).
export const Default = {
  render: () => (
    <div data-ui="organism.dod-form.create">
      <DefinitionOfDoneForm open onClose={noop} onCreate={noop} />
    </div>
  ),
}

// Main: vorbefüllt aus einem erledigten Kriterium (dod-item.detail) — maßgeblicher Hauptfall.
export const Main = {
  render: () => (
    <div data-ui="organism.dod-form.edit">
      <DefinitionOfDoneForm
        open
        onClose={noop}
        onPatch={noop}
        item={{
          id: 5,
          label: 'Coverage ≥ 80 %',
          details: 'Gemessen via vitest --coverage über die gesamte Suite.',
          done: 1,
          created_at: '2026-06-18T09:00:00Z',
          updated_at: '2026-06-19T08:30:00Z',
        }}
      />
    </div>
  ),
}
