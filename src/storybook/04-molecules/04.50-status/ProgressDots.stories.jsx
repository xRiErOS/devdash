/**
 * GF-208-Muster — ProgressDots (04.50 Status). Lifecycle-Stepper-Molecule,
 * token-sauber, props-driven (kein Store/Fetch). Default = args-Baseline;
 * data-ui je Achse + je Element (PO-Ansprechbarkeit, T01).
 */
import ProgressDots from '../../../components/ui/molecules/ProgressDots.jsx'

const VARIANTS = ['issue', 'sprint', 'milestone']
// Gültiger aktueller Schritt je Variante (sprint hat kein 'in_progress').
const CURRENT = { issue: 'in_progress', sprint: 'active', milestone: 'in_progress' }

const meta = {
  title: '04 MOLECULES/04.50 Status/ProgressDots',
  component: ProgressDots,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      description: 'Default-Schritt-Set (issue/sprint/milestone).',
    },
    current: {
      control: 'text',
      description: 'Schlüssel des aktuellen Status (z.B. in_progress).',
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    showLabels: { control: 'boolean', description: 'Schritt-Beschriftungen anzeigen.' },
  },
  args: {
    variant: 'issue',
    current: 'in_progress',
    orientation: 'horizontal',
    size: 'md',
    showLabels: true,
  },
}
export default meta

// Default: minimaler Baseline-Zustand — nur strukturell nötige variant, sonst
// Komponenten-Default-Props (keine Labels, kein current). Inhaltlich != Main.
export const Default = {
  args: { variant: 'issue', current: undefined, showLabels: false },
  render: (args) => (
    <div data-ui="molecule.progress-dots.default" className="max-w-md">
      <ProgressDots {...args} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (Klon der Default-Baseline, da kein eigener Rich-Fall existiert).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.progress-dots.main" className="max-w-md">
      <ProgressDots {...args} />
    </div>
  ),
}

// Variants = Schritt-Set (issue/sprint/milestone) + Orientierung. Alle horizontalen
// Varianten STETS GLEICH BREIT (feste w-96, ol w-full, li min-w-0 → Labels wrappen
// statt die Verteilung zu sprengen). Atom-Anker direkt auf der Komponente
// (dataUiScope=molecule.progress-dots.variant-*), damit jedes sichtbare Element 1:1
// adressierbar ist (I01). Vertikale Darstellung als eigene Variante (PO 2026-06-16).
export const Variant_All = {
  render: () => (
    <div data-ui="molecule.progress-dots.variants" className="flex flex-col gap-8">
      {VARIANTS.map((v) => (
        <div key={v} data-ui={`molecule.progress-dots.variant-${v}-wrap`} className="w-96">
          <ProgressDots variant={v} current={CURRENT[v]} dataUiScope={`molecule.progress-dots.variant-${v}`} />
        </div>
      ))}
      <div data-ui="molecule.progress-dots.verticals" className="flex flex-wrap gap-16 pt-2">
        {VARIANTS.map((v) => (
          <div key={`vert-${v}`} className="h-72">
            <ProgressDots variant={v} current={CURRENT[v]} orientation="vertical" dataUiScope={`molecule.progress-dots.variant-vertical-${v}`} />
          </div>
        ))}
      </div>
    </div>
  ),
}

// Sizes = size-Prop (sm/md Dot-Größe).
export const Variant_Sizes = {
  render: () => (
    <div data-ui="molecule.progress-dots.sizes" className="flex flex-col gap-6 max-w-md">
      {['sm', 'md'].map((s) => (
        <div key={s} data-ui={`molecule.progress-dots.size-${s}`}>
          <ProgressDots variant="sprint" current="active" size={s} dataUiScope={`molecule.progress-dots.size-${s}`} />
        </div>
      ))}
    </div>
  ),
}

// States = Zustand-Boolean (showLabels an/aus).
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.progress-dots.states" className="flex flex-col gap-6 max-w-md">
      <div data-ui="molecule.progress-dots.state-labels">
        <ProgressDots variant="sprint" current="active" showLabels dataUiScope="molecule.progress-dots.state-labels" />
      </div>
      <div data-ui="molecule.progress-dots.state-no-labels">
        <ProgressDots variant="sprint" current="active" showLabels={false} dataUiScope="molecule.progress-dots.state-no-labels" />
      </div>
    </div>
  ),
}

// Composition = Orientierungs-Anordnung. Horizontal UND vertikal GEMEINSAM in
// EINER Story, nebeneinander zum direkten Vergleich (B03). Horizontal mit fester
// Breite (w-96), vertikal direkt daneben.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.progress-dots.composition" className="flex flex-wrap items-start gap-12">
      <div data-ui="molecule.progress-dots.horizontal" className="w-96 shrink-0">
        <ProgressDots variant="milestone" current="in_progress" orientation="horizontal" dataUiScope="molecule.progress-dots.horizontal" />
      </div>
      <div data-ui="molecule.progress-dots.vertical" className="shrink-0">
        <ProgressDots variant="milestone" current="in_progress" orientation="vertical" dataUiScope="molecule.progress-dots.vertical" />
      </div>
    </div>
  ),
}
