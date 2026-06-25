/**
 * Kbd (03.20 Display) — Tastatur-Shortcut-Anzeige (keyboard-first). Natives
 * <kbd>, mono, getönte Fläche + feine Border. Achsen: Default (args-Baseline),
 * Sizes (sm/md), Composition (Einzeltaste vs Kombo — mehrere <Kbd> nebeneinander).
 * Muster = Button.stories.jsx / Badge.stories.jsx. tags status:stable (neu).
 */
import Kbd from '../../../components/ui/atoms/Kbd.jsx'

const meta = {
  title: '03 ATOMS/03.20 Display/Kbd',
  component: Kbd,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Tasten-Glyph(en), z.B. S, ⌘, Esc.' },
    size: { control: 'inline-radio', options: ['sm', 'md'], description: 'sm = 16px, md = 20px Höhe.' },
  },
  args: { children: 'S', size: 'md' },
}
export default meta

// Default: args-getrieben (autodocs <Primary>) — Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.kbd.default"><Kbd {...args} /></div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.kbd.sizes" className="flex items-center gap-2">
      {['sm', 'md'].map((s) => (
        <Kbd key={s} size={s} data-ui={`atom.kbd.size-${s}`}>{s === 'sm' ? '⌘' : '⌘'}</Kbd>
      ))}
    </div>
  ),
}

// Composition = Einzeltaste vs Kombo (mehrere <Kbd> nebeneinander, Trenner beim Aufrufer).
export const Composition = {
  render: () => (
    <div data-ui="atom.kbd.composition" className="flex flex-col gap-3">
      <div data-ui="atom.kbd.single">
        <Kbd>Esc</Kbd>
      </div>
      <div data-ui="atom.kbd.combo" className="inline-flex items-center gap-1 text-[var(--subtext0)]">
        <Kbd>⌘</Kbd>
        <span>+</span>
        <Kbd>S</Kbd>
      </div>
    </div>
  ),
}
