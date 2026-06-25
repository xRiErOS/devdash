/**
 * WireframeSlot (03.20 Display) — Atom (NEU, FEAT-32). Low-Fi-Platzhalter für die
 * 1:1-Replik von draw.io-Wireframes als Storybook-Story. Schreibt den draw.io-`data-ui`
 * sichtbar in die Box. Achsen: Default → Variants (tone) → Composition. tags status:stable.
 *
 * GF-345: Variants-Story vergibt je tone-Item einen eigenen data-ui-Anker via
 * `dataUiScope`-Prop (`atom.wireframe-slot.tone-${tone}`). Composition-Story ergänzt.
 */
import WireframeSlot from '../../../components/ui/atoms/WireframeSlot.jsx'

const TONES = ['slot', 'area', 'region', 'control', 'accent', 'text']

const meta = {
  title: '03 ATOMS/03.20 Display/WireframeSlot',
  component: WireframeSlot,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'inline-radio', options: TONES, description: 'Optik-Achse (slot/area/region/control/accent/text).' },
    anchor: { control: 'text', description: 'draw.io-data-ui-Anker (sichtbar + data-anchor).' },
    label: { control: 'text', description: 'Widget-/Region-Name (fett).' },
    scope: { control: 'text', description: 'Entitäts-Scope-Klammer.' },
    dataUiScope: { control: 'text', description: 'Überschreibt data-ui="wireframe-slot" (GF-345, per-tone-Adressierbarkeit).' },
  },
  args: {
    anchor: 'entity-detail.slot.content',
    label: 'ContentBlock',
    scope: '[Issue · Memory]',
    flow: '4',
    flowD: '1',
    tone: 'slot',
  },
}
export default meta

// Default: args-Baseline — ein Slot-Platzhalter mit sichtbarem data-ui.
export const Default = {
  render: (args) => (
    <div data-ui="atom.wireframe-slot.default" className="h-24 w-72">
      <WireframeSlot {...args} className="h-full w-full" />
    </div>
  ),
}

// Variants: alle tone-Achsen nebeneinander — jedes Item trägt eigenen data-ui (GF-345).
export const Variants = {
  render: () => (
    <div data-ui="atom.wireframe-slot.variants" className="grid grid-cols-3 gap-3">
      {TONES.map((tone) => (
        <WireframeSlot
          key={tone}
          tone={tone}
          anchor={`example.${tone}`}
          label={tone}
          scope="[scope]"
          dataUiScope={`atom.wireframe-slot.tone-${tone}`}
          className="h-20 w-full"
        />
      ))}
    </div>
  ),
}

// Composition: WireframeSlot in einem typischen Wireframe-Slot-Kontext (draw.io-Replik-Pattern).
// Mehrere Slots nebeneinander mit verschiedenen Rollen (Shell + Slot + Control).
export const Composition = {
  render: () => (
    <div data-ui="atom.wireframe-slot.composition" className="flex flex-col gap-2 w-96">
      <WireframeSlot
        tone="region"
        anchor="app-shell.topbar"
        label="Topbar"
        scope="[App Shell]"
        dataUiScope="atom.wireframe-slot.comp-region"
        className="h-10 w-full"
      />
      <div className="flex gap-2 h-48">
        <WireframeSlot
          tone="area"
          anchor="entity-detail.area-left"
          label="Sidebar"
          scope="[Nav]"
          dataUiScope="atom.wireframe-slot.comp-area"
          className="h-full w-24"
        />
        <div className="flex flex-col gap-2 flex-1">
          <WireframeSlot
            tone="slot"
            anchor="entity-detail.slot.header"
            label="Header"
            scope="[Issue]"
            flow="1"
            flowD="1"
            dataUiScope="atom.wireframe-slot.comp-slot-header"
            className="h-16 w-full"
          />
          <WireframeSlot
            tone="slot"
            anchor="entity-detail.slot.content"
            label="ContentBlock"
            scope="[Issue · Memory]"
            flow="4"
            flowD="2"
            dataUiScope="atom.wireframe-slot.comp-slot-content"
            className="flex-1 w-full"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <WireframeSlot
          tone="control"
          anchor="entity-detail.action.save"
          label="Save"
          dataUiScope="atom.wireframe-slot.comp-control-save"
          className="h-8 w-20"
        />
        <WireframeSlot
          tone="accent"
          anchor="entity-detail.action.primary"
          label="Primary"
          dataUiScope="atom.wireframe-slot.comp-accent"
          className="h-8 w-24"
        />
        <WireframeSlot
          tone="text"
          anchor="entity-detail.breadcrumb"
          label="Breadcrumb / Issue-123"
          dataUiScope="atom.wireframe-slot.comp-text"
          className="h-8 flex-1"
        />
      </div>
    </div>
  ),
}
