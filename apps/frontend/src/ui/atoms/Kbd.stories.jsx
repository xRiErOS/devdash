/**
 * Kbd — Tasten-Glyph für Shortcut-Anzeigen. data-ui je Wrapper + Instanz.
 * 0 inline-style / 0 Raw-Hex.
 */
import Kbd from './Kbd.jsx'

const meta = {
  title: '02 ATOMS/Kbd',
  component: Kbd,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { children: { control: 'text' } },
  args: { children: 'K' },
}
export default meta

export const Default = {
  render: (args) => <Kbd {...args} dataUiScope="atom.kbd.default" />,
}

// Typische Shortcuts — einzeln und kombiniert (⌘K, ⇧⌘P).
export const Shortcuts = {
  render: () => (
    <div data-ui="atom.kbd.shortcuts" className="flex items-center gap-[var(--space-3)]">
      <span className="flex gap-[3px]"><Kbd dataUiScope="atom.kbd.cmd">⌘</Kbd><Kbd dataUiScope="atom.kbd.k">K</Kbd></span>
      <span className="flex gap-[3px]"><Kbd dataUiScope="atom.kbd.shift">⇧</Kbd><Kbd dataUiScope="atom.kbd.cmd2">⌘</Kbd><Kbd dataUiScope="atom.kbd.p">P</Kbd></span>
      <Kbd dataUiScope="atom.kbd.esc">esc</Kbd>
    </div>
  ),
}
