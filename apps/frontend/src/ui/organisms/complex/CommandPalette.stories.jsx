/**
 * CommandPalette — Codium-Stil-Befehlsliste (als Karte gezeigt). Komponiert Kbd +
 * Icon. Über Demo-Hintergrund.
 * 0 inline-style / 0 Raw-Hex.
 */
import CommandPalette from './CommandPalette.jsx'

const meta = {
  title: '04 ORGANISMS/CommandPalette',
  component: CommandPalette,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  args: {},
}
export default meta

export const Default = {
  render: (args) => (
    <div className="relative bg-[var(--base)] min-h-[480px] p-6 flex justify-center">
      <CommandPalette {...args} dataUiScope="organism.commandPalette.default" />
    </div>
  ),
}
