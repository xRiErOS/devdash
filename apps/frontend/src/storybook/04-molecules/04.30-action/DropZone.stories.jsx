/**
 * GF-276 — DropZone (04.30 Action, ML-19 / I06). Geteilter Desktop-Drag-Target-
 * Frame: gestrichelte Fläche + Icon + Label + optionaler Hint. Komponiert von
 * OR-15/24/26 statt 3× eigener Drag-Logik. Touch-Drop deferred (D09).
 *
 * Dumb (CONV-molecule-boundary): Drag-Plumbing + over-Visual sind generische UI;
 * Datei-Filter/Upload (Domäne) liegt beim Consumer (onFiles/onActivate). Das
 * `active`-Prop erzwingt das over-Visual für die Story-Darstellung.
 */
import DropZone from '../../../components/ui/molecules/DropZone.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.30 Action/DropZone',
  component: DropZone,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    surface: { control: 'inline-radio', options: ['ghost', 'filled'], description: 'Idle-Fläche: ghost=transparent (Default, D03), filled=grau (opt-in).' },
    active: { control: 'boolean', description: 'erzwingt das Drag-over-Visual (sonst intern).' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Dateien hierher ziehen',
    hint: 'oder klicken zum Auswählen',
    surface: 'ghost',
    active: false,
    disabled: false,
  },
}
export default meta

// Default: minimal — Default-Props, kein Label/Hint/Surface aus meta.
export const Default = {
  render: () => (
    <div data-ui="molecule.dropzone.default" className="max-w-md">
      <DropZone onFiles={noop} onActivate={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — voller Drop-Frame mit Label + Hint.
export const Main = {
  render: () => (
    <div data-ui="molecule.dropzone.main" className="max-w-md">
      <DropZone
        label="Dateien hierher ziehen"
        hint="oder klicken zum Auswählen"
        surface="ghost"
        onFiles={noop}
        onActivate={noop}
      />
    </div>
  ),
}

// Variant_States: idle · drag-over (active) · gesperrt.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.dropzone.states" className="grid max-w-2xl gap-3 sm:grid-cols-3">
      <div data-ui="molecule.dropzone.state-idle"><DropZone label="Idle" onFiles={noop} onActivate={noop} /></div>
      <div data-ui="molecule.dropzone.state-active"><DropZone label="Drag-over" active onFiles={noop} onActivate={noop} /></div>
      <div data-ui="molecule.dropzone.state-disabled"><DropZone label="Gesperrt" disabled onFiles={noop} onActivate={noop} /></div>
    </div>
  ),
}

// Variant_Appearance: ghost (transparent, Default/Clean-Look) vs filled (graue Fläche, opt-in) — D03.
export const Variant_Appearance = {
  render: () => (
    <div data-ui="molecule.dropzone.appearance" className="grid max-w-2xl gap-3 sm:grid-cols-2">
      <div data-ui="molecule.dropzone.appearance-ghost"><DropZone surface="ghost" label="ghost (Default)" hint="transparent" onFiles={noop} onActivate={noop} /></div>
      <div data-ui="molecule.dropzone.appearance-filled"><DropZone surface="filled" label="filled (opt-in)" hint="graue Fläche" onFiles={noop} onActivate={noop} /></div>
    </div>
  ),
}

// Variant_Composition: Icon (foundations) + Label + Hint — das volle Upload-Affordanz-Muster.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.dropzone.composition" className="max-w-md">
      <div data-ui="molecule.dropzone.upload">
        <DropZone
          icon={<Icon name="file-add" size={24} mono />}
          label="Anhänge ablegen"
          hint="PNG, JPG bis 10 MB · oder klicken"
          onFiles={noop}
          onActivate={noop}
        />
      </div>
    </div>
  ),
}
