/**
 * ProgressBar — dichotomer Fortschritt `value/total`. Achse: Füllgrad.
 * Grün = erledigt (done+passed), neutrale Spur = Rest. 0 inline / 0 Hex.
 */
import ProgressBar from './ProgressBar.jsx'

const meta = {
  title: '02 ATOMS/ProgressBar',
  component: ProgressBar,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: { type: 'number' } },
    total: { control: { type: 'number' } },
    showLabel: { control: 'boolean' },
  },
  args: { value: 3, total: 6, showLabel: true },
  render: (args) => (
    <div data-ui="atom.progressBar.story" className="w-[240px]">
      <ProgressBar {...args} />
    </div>
  ),
}
export default meta

export const Empty = { args: { value: 0, total: 5 } }
export const Half = { args: { value: 3, total: 6 } }
export const Full = { args: { value: 8, total: 8 } }
// Sprint nur mit stornierten Issues → total 0 (cancelled exkludiert) → leere Spur.
export const AllCancelled = { args: { value: 0, total: 0 } }
