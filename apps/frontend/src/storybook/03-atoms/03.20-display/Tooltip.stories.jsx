/**
 * GF-208-Muster — Tooltip (03.20 Display). Token-saubere Portal-Tooltip-Primitive
 * (harvested aus ui/Tooltip.jsx, DD-166 R3). Props-driven, kein Store.
 *
 * Achsen (kanonisches Vokabular, nur zutreffende): Default (args-Baseline) ·
 * Variants (placement top/bottom) · Composition (Trigger-Slot: Icon-Trigger +
 * Passthrough ohne Label). Keine Appearance/Sizes/States (kein Farb-/Size-/
 * Zustands-Prop). Default = args-getrieben (autodocs-Primary, immer zuerst).
 *
 * Hinweis Rendering: der Tooltip-Body öffnet erst on hover/focus (open-State)
 * und wird per Portal in document.body gemountet — im statischen Markup
 * erscheint nur der Trigger-Wrapper. data-ui je Trigger (PO-Ansprechbarkeit, T01).
 */
import Tooltip from '../../../components/ui/atoms/Tooltip.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const PLACEMENTS = ['top', 'bottom']

const meta = {
  title: '03 ATOMS/03.20 Display/Tooltip',
  component: Tooltip,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text', description: 'Tooltip-Text. Falsy → nur children gerendert (Passthrough).' },
    placement: {
      control: 'inline-radio',
      options: PLACEMENTS,
      description: 'Position relativ zum Trigger (Anker via getBoundingClientRect).',
    },
    children: { control: false, description: 'Trigger-Element (Slot).' },
  },
  args: { label: 'Aktion starten', placement: 'bottom' },
}
export default meta

// Default: args-getrieben — Controls steuern label + placement.
export const Default = {
  render: (args) => (
    <div data-ui="atom.tooltip.default">
      <Tooltip {...args}>
        <button
          type="button"
          className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium bg-[var(--surface1)] text-[var(--text)]"
        >
          Hover me
        </button>
      </Tooltip>
    </div>
  ),
}

// Variants = placement-Achse (top/bottom). Jeder Trigger eigener data-ui.
export const Variants = {
  render: () => (
    <div data-ui="atom.tooltip.variants" className="flex flex-wrap gap-4">
      {PLACEMENTS.map((p) => (
        <Tooltip key={p} label={`Tooltip ${p}`} placement={p}>
          <button
            type="button"
            data-ui={`atom.tooltip.${p}`}
            className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium bg-[var(--surface1)] text-[var(--text)]"
          >
            placement {p}
          </button>
        </Tooltip>
      ))}
    </div>
  ),
}

// Composition = Trigger-Slot-Varianten: Icon-Trigger + Passthrough ohne Label.
export const Composition = {
  render: () => (
    <div data-ui="atom.tooltip.composition" className="flex flex-wrap items-center gap-4">
      <Tooltip label="Mit Icon-Trigger" placement="bottom">
        <button
          type="button"
          data-ui="atom.tooltip.icon-trigger"
          aria-label="Aktion starten"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--surface1)] text-[var(--text)]"
        >
          <Icon name="add" size={16} />
        </button>
      </Tooltip>
      <Tooltip label="" placement="bottom">
        <button
          type="button"
          data-ui="atom.tooltip.no-label"
          className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium bg-[var(--surface1)] text-[var(--text)]"
        >
          Kein Tooltip (Passthrough)
        </button>
      </Tooltip>
    </div>
  ),
}
