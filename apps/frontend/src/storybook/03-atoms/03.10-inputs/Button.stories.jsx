/**
 * GF-208 — REFERENZ-STORY (verbindliches Muster für jede GF-2-Story).
 *
 * Muster-Checkliste (jede neue Story kopiert dies):
 *  1. title = `NN CATEGORY/NN.NN Directory/Story` (Pfad = Tier-Wahrheit, D12).
 *  2. tags: ['status:<reife>'] (D09). domain:/composes: NUR wenn zutreffend
 *     (Button = generisches Atom → keine Domäne; GF-205 setzt composes: auto).
 *  3. component + argTypes (Controls) → autodocs/MDX zieht Props live.
 *  4. Kanonisches Story-Achsen-Vokabular (PO 2026-06-15, feste Reihenfolge, nur
 *     zutreffende Achsen): Default · Variants · Appearance · Sizes · States ·
 *     Composition. Default (args-getrieben) = autodocs-Primary, immer zuerst.
 *  5. data-ui an jedem Story-Wrapper (T01) — PO spricht Elemente 1:1 an.
 *  6. 0 inline-style, 0 Roh-Hex (Enforcement). Layout via Tailwind-Utilities.
 *  7. Begleit-MDX (Button.mdx) mit <Meta of={…}> = die Doku-Seite (Pflichtabschnitte).
 *  8. Node-Snapshot-Gate (tests/frontend-rework/gf208-button-ref.test.jsx) =
 *     Tier-Gate-Vorlage (GF-210 generalisiert sie).
 */
import Button from '../../../components/ui/atoms/Button.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Button',
  component: Button,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'success'],
      description: 'Visuelle Rolle — semantische Akzent-Tokens (DD-47).',
    },
    appearance: {
      control: 'inline-radio',
      options: ['solid', 'tint'],
      description: 'Farb-Treatment: solid (gefüllt, Default) | tint (Terminal: ton-getönt + Rand, scharf — GF-337).',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'lg = 44px Touch-Target (Mobile-Pflicht).',
    },
    loading: { control: 'boolean', description: 'Spinner + disabled + aria-busy.' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    children: 'Aktion',
    variant: 'primary',
    appearance: 'solid',
    size: 'md',
    loading: false,
    disabled: false,
  },
}
export default meta

// Default: args-getrieben — Controls-Panel steuert alle Props. CSF-kanonischer
// Baseline-Export (autodocs <Primary>), Repo-Konvention (composeStories Default).
export const Default = {
  render: (args) => (
    <div data-ui="atom.button.default">
      <Button {...args} />
    </div>
  ),
}

// Muster-Regel (T01-Erweiterung): nicht nur der Story-Wrapper, sondern JEDES
// Varianten-Element trägt ein eigenes data-ui (z.B. atom.button.primary,
// atom.button.icon-left) — PO spricht jede Variante 1:1 an. Button spreadt
// {...rest} nach dem internen data-ui="button", die hier gesetzten überschreiben.
export const Variants = {
  render: () => (
    <div data-ui="atom.button.variants" className="flex flex-wrap gap-2">
      {['primary', 'secondary', 'ghost', 'danger', 'success'].map((v) => (
        <Button key={v} variant={v} data-ui={`atom.button.${v}`}>{v}</Button>
      ))}
    </div>
  ),
}

// Appearance = Farb-Treatment (solid vs tint). tint = Terminal-Sprache (GF-337):
// ton-getönter BG + Rand, scharfe Kante — border-driven statt gefüllter Akzent-Block.
export const Appearance = {
  render: () => (
    <div data-ui="atom.button.appearance" className="flex flex-col gap-3">
      <div data-ui="atom.button.appearance-solid" className="flex flex-wrap gap-2">
        {['primary', 'secondary', 'ghost', 'danger', 'success'].map((v) => (
          <Button key={v} variant={v} appearance="solid" data-ui={`atom.button.solid-${v}`}>{v}</Button>
        ))}
      </div>
      <div data-ui="atom.button.appearance-tint" className="flex flex-wrap gap-2">
        {['primary', 'secondary', 'ghost', 'danger', 'success'].map((v) => (
          <Button key={v} variant={v} appearance="tint" data-ui={`atom.button.tint-${v}`}>{v}</Button>
        ))}
      </div>
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.button.sizes" className="flex items-center gap-2">
      {['sm', 'md', 'lg'].map((s) => (
        <Button key={s} size={s} data-ui={`atom.button.size-${s}`}>size {s}</Button>
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (loading/disabled) — ein Story, kanonische Achse.
export const States = {
  render: () => (
    <div data-ui="atom.button.states" className="flex gap-2">
      <Button data-ui="atom.button.state-loading" loading>Lädt</Button>
      <Button data-ui="atom.button.state-disabled" disabled>Gesperrt</Button>
    </div>
  ),
}

// Composition = Slot-/Icon-Anordnung.
export const Composition = {
  render: () => (
    <div data-ui="atom.button.composition" className="flex gap-2">
      <Button data-ui="atom.button.icon-left" leadingIcon={<Icon name="add" size={14} />}>Neu</Button>
      <Button data-ui="atom.button.icon-right" variant="secondary" trailingIcon={<Icon name="arrow-right" size={14} />}>Weiter</Button>
    </div>
  ),
}
