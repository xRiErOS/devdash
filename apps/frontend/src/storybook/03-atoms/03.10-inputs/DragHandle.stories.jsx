/**
 * GF-323 — DragHandle (03.10 Inputs). Kanonischer Drag-Anfasser (ghost-IconButton +
 * GripVertical), extrahiert aus EntityItem (D08). Reorderbare Zeilen/Karten +
 * MilestoneBoardColumn teilen diese eine Quelle.
 * GF-351: Composition-Achse ergänzt (label-Slot-Kontext).
 */
import DragHandle from '../../../components/ui/atoms/DragHandle.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/DragHandle',
  component: DragHandle,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
  args: { label: 'Ziehen zum Sortieren', size: 'sm', disabled: false },
}
export default meta

// Default: args-getrieben — der Anfasser in Baseline-Größe.
export const Default = {
  render: (args) => (
    <div data-ui="atom.drag-handle.default">
      <DragHandle {...args} />
    </div>
  ),
}

// Sizes: sm | md | lg (Touch-Target-Skalierung wie IconButton).
export const Sizes = {
  render: () => (
    <div data-ui="atom.drag-handle.sizes" className="flex items-center gap-2">
      <DragHandle size="sm" data-ui="atom.drag-handle.size-sm" />
      <DragHandle size="md" data-ui="atom.drag-handle.size-md" />
      <DragHandle size="lg" data-ui="atom.drag-handle.size-lg" />
    </div>
  ),
}

// States: aktiv (greifbar) vs disabled (nicht sortierbar).
export const States = {
  render: () => (
    <div data-ui="atom.drag-handle.states" className="flex items-center gap-2">
      <DragHandle data-ui="atom.drag-handle.state-default" />
      <DragHandle disabled data-ui="atom.drag-handle.state-disabled" />
    </div>
  ),
}

// Composition: label-Slot-Kontext — DragHandle mit sichtbarem Label in einer
// sortierbaren Zeile (Slot-Komposition: Handle links, Inhalt rechts).
export const Composition = {
  render: () => (
    <div data-ui="atom.drag-handle.composition" className="flex flex-col gap-2 max-w-xs">
      <div data-ui="atom.drag-handle.composition-with-label" className="flex items-center gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <DragHandle label="Ziehen zum Sortieren" />
        <span className="text-sm text-[var(--text)]">Sprint-Story 1 — mit Label-Slot</span>
      </div>
      <div data-ui="atom.drag-handle.composition-no-label" className="flex items-center gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <DragHandle />
        <span className="text-sm text-[var(--text)]">Sprint-Story 2 — ohne Label</span>
      </div>
    </div>
  ),
}
