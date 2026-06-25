/**
 * Link — Atom (03.10 Inputs). Styled Navigations-Link auf nativem `<a href>`.
 * Muster = Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Achsen: Link trägt variant (default/muted) + external/obsidian-State → Default ·
 * Variants · States. Reife status:stable (neu, noch nicht PO-reviewt).
 */
import Link from '../../../components/ui/atoms/Link.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Link',
  component: Link,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    href: { control: 'text', description: 'Ziel-URL (nativ).' },
    variant: {
      control: 'inline-radio',
      options: ['default', 'muted'],
      description: 'Akzent (`--accent-info`) vs. gedämpft (`--subtext0`).',
    },
    external: {
      control: 'boolean',
      description: 'Neues Tab (target=_blank + rel=noopener) + Extern-Icon.',
    },
    obsidian: {
      control: 'boolean',
      description: 'Obsidian-URI-Kennung (Gem-Icon) + rel-Hardening.',
    },
    children: { control: 'text' },
  },
  args: {
    href: '#roadmap',
    variant: 'default',
    external: false,
    obsidian: false,
    children: 'Zur Roadmap',
  },
}
export default meta

// Default: args-getrieben (autodocs <Primary>) — Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.link.default">
      <Link {...args} />
    </div>
  ),
}

// Variants = variant-Prop (default/muted). Jede Variante 1:1 ankerbar.
export const Variants = {
  render: () => (
    <div data-ui="atom.link.variants" className="flex flex-wrap gap-4">
      {['default', 'muted'].map((v) => (
        <Link key={v} href="#" variant={v} data-ui={`atom.link.${v}`}>
          {v}
        </Link>
      ))}
    </div>
  ),
}

// States = Ziel-Zustand (intern · extern · obsidian, je mit Indikator-Icon).
export const States = {
  render: () => (
    <div data-ui="atom.link.states" className="flex flex-col items-start gap-2">
      <Link href="/intern" data-ui="atom.link.internal">Interner Link</Link>
      <Link href="https://storybook.js.org" external data-ui="atom.link.external">
        Externe Doku
      </Link>
      <Link
        href="obsidian://open?vault=Vault&file=Roadmap"
        obsidian
        data-ui="atom.link.obsidian"
      >
        Obsidian-Note
      </Link>
    </div>
  ),
}
