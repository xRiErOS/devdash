/**
 * FilterMenu — anker-loses Filter-Popover (als Karte gezeigt). Komponiert Chip +
 * Checkbox + Icon + Button. Über Demo-Hintergrund.
 * 0 inline-style / 0 Raw-Hex.
 */
import FilterMenu from './FilterMenu.jsx'

const meta = {
  title: '04 ORGANISMS/FilterMenu',
  component: FilterMenu,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  args: {},
}
export default meta

export const Default = {
  render: (args) => (
    <div className="relative bg-[var(--base)] min-h-[480px] p-6 flex justify-center">
      <FilterMenu {...args} dataUiScope="organism.filterMenu.default" />
    </div>
  ),
}
