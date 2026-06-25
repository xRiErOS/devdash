/**
 * GF-208-Muster — TagChip (04.40 Data Display, GF-238 / D06). Molecule: Tag-Atom
 * + optionaler Count-Badge + Remove-IconButton. Dumb (CONV-molecule-boundary):
 * kein State — onRemove ist Consumer-Callback. data-ui je Story + je Element (T01).
 */
import TagChip from '../../../components/ui/molecules/TagChip.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.40 Data Display/TagChip',
  component: TagChip,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    color: {
      control: 'select',
      options: ['neutral', 'primary', 'success', 'danger', 'warning', 'info'],
      description: 'Tag-Farbe (Token).',
    },
    count: { control: 'number', description: 'Optionaler Count → Badge.' },
    children: { control: 'text', description: 'Tag-Label.' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Bug',
    color: 'danger',
    count: 3,
    disabled: false,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — nur Label, kein Count, kein Remove.
export const Default = {
  args: { children: 'Tag', color: undefined, count: undefined, disabled: undefined },
  render: (args) => (
    <div data-ui="molecule.tag-chip.default">
      <TagChip {...args} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (voll bestückt:
// Tag + Count + Remove), da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: (args) => (
    <div data-ui="molecule.tag-chip.main">
      <TagChip {...args} onRemove={noop} removeLabel="Label entfernen" />
    </div>
  ),
}

// Colors = Farb-Achse (Token-Tones). Je Tone ein entfernbarer Chip.
export const Variant_Colors = {
  render: () => (
    <div data-ui="molecule.tag-chip.colors" className="flex flex-wrap items-center gap-2">
      {['neutral', 'primary', 'success', 'danger', 'warning', 'info'].map((c) => (
        <div key={c} data-ui={`molecule.tag-chip.${c}`}>
          <TagChip color={c} onRemove={noop} removeLabel={`${c} entfernen`}>{c}</TagChip>
        </div>
      ))}
    </div>
  ),
}

// Composition = Slot-Belegung: nur Tag, +Count, entfernbar, Count+Remove.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.tag-chip.composition" className="flex flex-wrap items-center gap-2">
      <div data-ui="molecule.tag-chip.tag-only"><TagChip color="primary">Nur Tag</TagChip></div>
      <div data-ui="molecule.tag-chip.with-count"><TagChip color="info" count={12}>Mit Count</TagChip></div>
      <div data-ui="molecule.tag-chip.removable"><TagChip color="success" onRemove={noop} removeLabel="Entfernen">Entfernbar</TagChip></div>
      <div data-ui="molecule.tag-chip.count-remove"><TagChip color="warning" count={5} onRemove={noop} removeLabel="Entfernen">Count + Remove</TagChip></div>
    </div>
  ),
}
