/**
 * GF-414 — MetaDataForm (05.60 Overlay). Kanonisches Edit-Form für Meta-Daten (PO-Rework
 * 2026-06-19, #3): der ghost-Edit-Button des MetaDataWidget öffnet dieses Form. Komponiert
 * ChecklistFormBase (Modal blur + Save/Cancel), rendert Select (control:'select') oder Input
 * (control:'text') je Feld, Draft + onSave(patch-diff). Der vollständige Body-Swap-Loop
 * (Read↔Edit) wird in der MetaDataWidget-Story (05.30) getestet; hier das Form isoliert.
 * Reworkt → status:stable (PO-Review passed 2026-06-20).
 */
import { fn, expect, userEvent } from 'storybook/test'
import MetaDataForm from '../../../components/ui/organisms/MetaDataForm.jsx'

const STATUS_OPTIONS = [{ value: 'active', label: 'Aktiv' }, { value: 'done', label: 'Erledigt' }]
const PRIO_OPTIONS = [{ value: 'low', label: 'Niedrig' }, { value: 'high', label: 'Hoch' }]

const FIELDS = [
  { key: 'status', label: 'Status', control: 'select', value: 'active', options: STATUS_OPTIONS },
  { key: 'owner', label: 'Owner', control: 'text', value: 'Erik' },
]

const FIELDS_FULL = [
  { key: 'status', label: 'Status', control: 'select', value: 'active', options: STATUS_OPTIONS },
  { key: 'priority', label: 'Priorität', control: 'select', value: 'high', options: PRIO_OPTIONS },
  { key: 'owner', label: 'Owner', control: 'text', value: 'Erik' },
  { key: 'points', label: 'Punkte', control: 'text', value: '5' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/MetaDataForm',
  component: MetaDataForm,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Form offen mit Select- + Text-Feld.
export const Default = {
  render: () => (
    <div data-ui="organism.meta-data-form.default" className="max-w-lg">
      <MetaDataForm open fields={FIELDS} onClose={fn()} onSave={fn()} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — volle Feld-Liste (Select + Text gemischt).
export const Main = {
  render: () => (
    <div data-ui="organism.meta-data-form.main" className="max-w-lg">
      <MetaDataForm open fields={FIELDS_FULL} onClose={fn()} onSave={fn()} />
    </div>
  ),
}

// State_Editing: Form offen (statischer Blick auf die Controls).
export const State_Editing = {
  render: () => (
    <div data-ui="organism.meta-data-form.editing" className="max-w-lg">
      <MetaDataForm open fields={FIELDS_FULL} onClose={fn()} onSave={fn()} />
    </div>
  ),
}

// Interaction_Save (Gleis 2): Text-Feld ändern → Speichern feuert onSave mit Diff-Patch.
const saveSpy = fn()
export const Interaction_Save = {
  render: () => (
    <div data-ui="organism.meta-data-form.save" className="max-w-lg">
      <MetaDataForm open fields={FIELDS} onClose={fn()} onSave={saveSpy} />
    </div>
  ),
  play: async ({ canvas }) => {
    saveSpy.mockClear()
    const ownerInput = canvas.getByLabelText('Owner')
    await userEvent.clear(ownerInput)
    await userEvent.type(ownerInput, 'Mira')
    await userEvent.click(canvas.getByRole('button', { name: /Speichern/i }))
    await expect(saveSpy).toHaveBeenCalledWith({ owner: 'Mira' })
  },
}
