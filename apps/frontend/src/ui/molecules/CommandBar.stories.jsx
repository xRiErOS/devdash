/**
 * CommandBar — Such-/Command-Anzeige (presentational). Achse: shortcut.
 * Komponiert Icon (Lupe) + Kbd (Shortcut). 0 inline / 0 Hex.
 */
import CommandBar from './CommandBar.jsx'

const meta = {
  title: '03 MOLECULES/CommandBar',
  component: CommandBar,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    placeholder: { control: 'text' },
    shortcut: { control: 'object' },
  },
  args: { placeholder: 'Suchen oder Befehl …', shortcut: ['⌘', 'K'] },
}
export default meta

export const Default = {
  render: (args) => <CommandBar {...args} dataUiScope="molecule.commandBar.default" />,
}

// Mit vs. ohne Shortcut-Hint.
export const ShortcutAxis = {
  render: () => (
    <div data-ui="molecule.commandBar.axis" className="flex flex-col gap-[var(--space-3)]">
      <CommandBar placeholder="Mit Shortcut" shortcut={['⌘', 'K']} dataUiScope="molecule.commandBar.with" />
      <CommandBar placeholder="Ohne Shortcut" dataUiScope="molecule.commandBar.without" />
    </div>
  ),
}
