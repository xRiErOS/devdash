/**
 * GF-243 — DialogHeader (04.60 Overlay, ML-18). Dialog-Kopfzeile: Titel-Text
 * (+ optionaler Subtitle) links, optionale Actions + Close-IconButton rechts.
 * Paart mit ModalShell (headerless) oder standalone.
 *
 * Dumb (CONV-molecule-boundary): reine Slots/Callbacks. Close nur bei onClose.
 */
import DialogHeader from '../../../components/ui/molecules/DialogHeader.jsx'
import IconButton from '../../../components/ui/atoms/IconButton.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.60 Overlay/DialogHeader',
  component: DialogHeader,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
  args: {
    title: 'Sprint abschließen',
    subtitle: '',
  },
}
export default meta

// Default: minimaler No-Args-Zustand — DialogHeader mit Default-Props.
export const Default = {
  args: { title: '', subtitle: '' },
  render: (args) => (
    <div data-ui="molecule.dialog-header.default" className="max-w-lg rounded-lg border border-[var(--surface1)]">
      <DialogHeader {...args} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Titel + Close-IconButton. Klon des Default-Render
// (kein eigener realistischer Hauptfall).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.dialog-header.main" className="max-w-lg rounded-lg border border-[var(--surface1)]">
      <DialogHeader {...args} onClose={noop} />
    </div>
  ),
}

// Variant_Composition: Titel + Subtitle + Extra-Action (IconButton) vor dem Close.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.dialog-header.composition" className="max-w-lg rounded-lg border border-[var(--surface1)]">
      <DialogHeader
        title="Issue verschieben"
        subtitle="DD-7 · Greenfield"
        onClose={noop}
        actions={
          <IconButton
            icon={<Icon name="help" size={16} />}
            label="Hilfe"
            onClick={noop}
            size="sm"
            variant="ghost"
          />
        }
      />
    </div>
  ),
}

// Variant_States: mit Close · ohne Close (onClose unset) · mit Subtitle.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.dialog-header.states" className="flex flex-col gap-3">
      <div data-ui="molecule.dialog-header.with-close" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogHeader title="Mit Close" onClose={noop} />
      </div>
      <div data-ui="molecule.dialog-header.no-close" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogHeader title="Ohne Close (statisch)" />
      </div>
    </div>
  ),
}
