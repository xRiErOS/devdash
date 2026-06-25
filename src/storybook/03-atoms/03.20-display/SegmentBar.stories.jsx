/**
 * GF-2 (GF-208-Muster) — SegmentBar (03.20 Display). Mehrsegmentige
 * Verhältnis-Leiste (Stacked-Bar), token-sauber, props-driven (DD-481).
 * Atom: rendert nur div/span + Tailwind-Tokens, komponiert keine anderen Atome.
 *
 * Achsen (kanonisches Vokabular, nur zutreffende): Default · Appearance
 * (track-Surface-Tone) · Sizes (size) · Composition (segments-Slot). Kein
 * variant-Prop → keine Variants; keine Zustand-Booleans → keine States.
 * data-ui je Story-Wrapper + je Element (PO-Ansprechbarkeit, T01).
 */
import SegmentBar from '../../../components/ui/atoms/SegmentBar.jsx'

const SIZES = ['xs', 'sm', 'md', 'lg']
const TRACKS = ['surface0', 'surface1', 'surface2']

// Kanonische 3-Farben-Sprint-Mischung: done / to_review / open.
const issueSegments = (done, review, open) => [
  { value: done, tone: 'success', label: `${done} fertig` },
  { value: review, tone: 'lavender', label: `${review} im Review` },
  { value: open, tone: 'neutral', label: `${open} offen` },
]

const meta = {
  title: '03 ATOMS/03.20 Display/SegmentBar',
  component: SegmentBar,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: SIZES,
      description: 'Track-Höhe (xs–lg).',
    },
    track: {
      control: 'inline-radio',
      options: TRACKS,
      description: 'Rest-/Track-Flächenfarbe (Rundungs-Gaps).',
    },
    label: { control: 'text', description: 'aria-label (Gesamtbeschreibung).' },
    segments: { control: 'object', description: 'Segmente {value, tone, label?} in Render-Reihenfolge.' },
  },
  args: {
    size: 'md',
    track: 'surface1',
    label: '4 fertig, 3 im Review, 10 offen',
    segments: issueSegments(4, 3, 10),
  },
}
export default meta

// Default: args-getrieben — Controls steuern alle Props (autodocs-Primary).
export const Default = {
  render: (args) => (
    <div data-ui="atom.segment-bar.default" className="w-72">
      <SegmentBar {...args} dataUiScope="atom.segment-bar.bar" />
    </div>
  ),
}

// Appearance = Flächen-Tone-Achse (track-Surface). Gefüllte Segmente bleiben
// gleich, der Rest-Track wechselt die Surface-Stufe.
export const Appearance = {
  render: () => (
    <div data-ui="atom.segment-bar.appearance" className="flex w-72 flex-col gap-3">
      {TRACKS.map((t) => (
        <SegmentBar
          key={t}
          track={t}
          segments={issueSegments(3, 2, 7)}
          label={`Track ${t}`}
          dataUiScope={`atom.segment-bar.track-${t}`}
        />
      ))}
    </div>
  ),
}

// Sizes = Track-Höhe.
export const Sizes = {
  render: () => (
    <div data-ui="atom.segment-bar.sizes" className="flex w-72 flex-col gap-3">
      {SIZES.map((s) => (
        <SegmentBar
          key={s}
          size={s}
          segments={issueSegments(5, 2, 5)}
          label={`Größe ${s}`}
          dataUiScope={`atom.segment-bar.size-${s}`}
        />
      ))}
    </div>
  ),
}

// Composition = Segment-Mischung (Slot-Achse): von voll-fertig bis leer.
export const Composition = {
  render: () => (
    <div data-ui="atom.segment-bar.composition" className="flex w-72 flex-col gap-3">
      <SegmentBar
        segments={issueSegments(9, 0, 0)}
        label="9 von 9 fertig"
        dataUiScope="atom.segment-bar.all-done"
      />
      <SegmentBar
        segments={issueSegments(0, 0, 12)}
        label="12 offen"
        dataUiScope="atom.segment-bar.all-open"
      />
      <SegmentBar
        segments={[]}
        label="Keine Issues"
        dataUiScope="atom.segment-bar.empty"
      />
    </div>
  ),
}
