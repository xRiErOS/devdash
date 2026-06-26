/**
 * DragHandle — Greif-Anfasser (Grip-Icon). Achsen: disabled, grabbing.
 * Einziger Drag-Trigger einer Card/Spalte. 0 inline / 0 Hex.
 */
import DragHandle from './DragHandle.jsx'

const meta = {
  title: '02 ATOMS/DragHandle',
  component: DragHandle,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    disabled: { control: 'boolean' },
    grabbing: { control: 'boolean' },
  },
  args: { label: 'Sprint verschieben' },
  render: (args) => (
    <div data-ui="atom.dragHandle.story">
      <DragHandle {...args} />
    </div>
  ),
}
export default meta

export const Default = {}
export const Disabled = { args: { disabled: true, label: 'Nicht verschiebbar' } }
export const Grabbing = { args: { grabbing: true } }
