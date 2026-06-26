/**
 * SegmentedControl — exklusive Umschalt-Gruppe. Achse: value (aktives Segment).
 * data-ui je Wrapper + Segment. 0 inline-style / 0 Raw-Hex.
 */
import SegmentedControl from './SegmentedControl.jsx'

const OPTIONS = [
  { key: 'struktur', label: 'Struktur', iconName: 'layers' },
  { key: 'backlog', label: 'Backlog', iconName: 'backlog' },
]

const meta = {
  title: '02 ATOMS/SegmentedControl',
  component: SegmentedControl,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: 'inline-radio', options: ['struktur', 'backlog'] },
  },
  args: { options: OPTIONS, value: 'struktur' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.segmented.default" className="w-64">
      <SegmentedControl {...args} dataUiScope="atom.segmented.view" />
    </div>
  ),
}
