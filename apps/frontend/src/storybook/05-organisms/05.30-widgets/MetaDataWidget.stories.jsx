/**
 * GF-414 — MetaDataWidget (05.30 Widgets). Kanonischer V2-Meta-Renderer (vormals MetaList,
 * zum Organismus gehoben). READ-ONLY Liste + zwei DUMB ghost-Affordanzen: onCopyForAi (Copy)
 * + onEdit (Pencil → öffnet MetaDataForm). Body-Swap-Kanon wie ContentBlock — die Stories
 * sind LIVE verdrahtet (useState-Wrapper), damit der Klickpfad Edit→Form im Storybook
 * testbar ist (PO #1). PO-Kanon: #1 Copy=ghost + Teil von Main · #2 Main zwei-spaltig ·
 * #4 KEIN Header per Default (title opt-in, von komponierender Story gestellt).
 * Reworkt → status:stable (PO-Review passed 2026-06-20).
 */
import { useState } from 'react'
import { fn, expect, userEvent, waitFor } from 'storybook/test'
import MetaDataWidget from '../../../components/ui/organisms/MetaDataWidget.jsx'
import MetaDataForm from '../../../components/ui/organisms/MetaDataForm.jsx'

const STATUS_OPTIONS = [{ value: 'active', label: 'Aktiv' }, { value: 'done', label: 'Erledigt' }]
const PRIO_OPTIONS = [{ value: 'low', label: 'Niedrig' }, { value: 'high', label: 'Hoch' }]

// Live-Wrapper: ghost-Edit öffnet die MetaDataForm (Form-Hoheit im komponierenden Frame,
// wie der echte EntityDetail-Frame im slot.meta komponiert, T04). onSave(patch) → Read
// aktualisiert. headed = optionaler Titel (#4: Header gibt die komponierende Story vor).
function LiveMeta({ dataUi, columns = 2, headed = false }) {
  const [data, setData] = useState({ status: 'active', priority: 'high', owner: 'Erik' })
  const [open, setOpen] = useState(false)
  const rows = [
    ['ID', 'DD-251'],
    ['Status', STATUS_OPTIONS.find((o) => o.value === data.status)?.label],
    ['Priorität', PRIO_OPTIONS.find((o) => o.value === data.priority)?.label],
    ['Owner', data.owner],
  ]
  const fields = [
    { key: 'status', label: 'Status', control: 'select', value: data.status, options: STATUS_OPTIONS },
    { key: 'priority', label: 'Priorität', control: 'select', value: data.priority, options: PRIO_OPTIONS },
    { key: 'owner', label: 'Owner', control: 'text', value: data.owner },
  ]
  return (
    <div data-ui={dataUi} className="max-w-lg">
      <MetaDataWidget
        title={headed ? 'metadaten' : undefined}
        columns={columns}
        rows={rows}
        onCopyForAi={fn()}
        onEdit={() => setOpen(true)}
      />
      <MetaDataForm
        open={open}
        fields={fields}
        onClose={() => setOpen(false)}
        onSave={(patch) => setData((d) => ({ ...d, ...patch }))}
      />
    </div>
  )
}

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/MetaDataWidget',
  component: MetaDataWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: headerlos (#4), READ-Rows + ghost Copy/Edit (#1), live verdrahtet.
export const Default = {
  render: () => <LiveMeta dataUi="organism.meta-data-widget.default" columns={1} />,
}

// Main (Kanon): zwei-spaltig (#2), headerlos (#4), Copy+Edit ghost Teil von Main (#1).
export const Main = {
  render: () => <LiveMeta dataUi="organism.meta-data-widget.main" columns={2} />,
}

// Variant_Heading: title via Prop — die komponierende Story stellt den Header (#4).
export const Variant_Heading = {
  render: () => <LiveMeta dataUi="organism.meta-data-widget.heading" columns={1} headed />,
}

// State_ReadOnly: ohne Callbacks → reine Read-Liste (keine Affordanzen, headerlos).
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.meta-data-widget.read-only" className="max-w-xs">
      <MetaDataWidget rows={[['ID', 'DD-251'], ['Status', 'Aktiv'], ['Owner', 'Erik']]} />
    </div>
  ),
}

// Interaction_Edit (PO #1, Gleis 2): Klick Pencil → MetaDataForm öffnet → Owner ändern →
// Speichern → Read-View zeigt neuen Wert (kompletter Body-Swap-Loop, getestet).
export const Interaction_Edit = {
  render: () => <LiveMeta dataUi="organism.meta-data-widget.editflow" columns={2} headed />,
  play: async ({ canvas, canvasElement }) => {
    // 1. Vor Klick: kein Dialog.
    expect(canvas.queryByRole('dialog')).toBeNull()
    // 2. Klick auf den ghost-Edit-Button → Form öffnet.
    await userEvent.click(canvas.getByLabelText('Meta bearbeiten'))
    const dialog = await waitFor(() => canvas.getByRole('dialog'))
    expect(dialog).toBeInTheDocument()
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-ui="meta-data-form.field-owner"]')).toBeTruthy(),
    )
    // 3. Owner editieren + speichern.
    const ownerInput = canvas.getByLabelText('Owner')
    await userEvent.clear(ownerInput)
    await userEvent.type(ownerInput, 'Mira')
    await userEvent.click(canvas.getByRole('button', { name: /Speichern/i }))
    // 4. Form schließt + Read-View zeigt den neuen Owner.
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(canvas.getByText('Mira')).toBeInTheDocument())
  },
}
