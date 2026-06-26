/**
 * UnassignedColumnHeader — Kopf der „Nicht zugeordnet"-Spalte. Titel +
 * Sprint-Count-Chip. Achse: count. 0 inline / 0 Hex.
 */
import UnassignedColumnHeader from './UnassignedColumnHeader.jsx'

const meta = {
  title: '03 MOLECULES/UnassignedColumnHeader',
  component: UnassignedColumnHeader,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { count: { control: { type: 'number' } } },
  render: (args) => (
    <div data-ui="molecule.unassignedColumnHeader.story" className="w-72 p-[var(--space-3)] rounded-lg bg-[var(--layer-3)] border border-dashed border-[var(--surface1)]">
      <UnassignedColumnHeader {...args} />
    </div>
  ),
}
export default meta

export const Empty = { args: { count: 0 } }
export const WithCount = { args: { count: 3 } }
