/**
 * GF-208-Muster — CopyButton (04.30 Action, GF-237). Molecule: IconButton (Copy→
 * Check/AlertCircle) in Tooltip mit transientem Feedback. Dumb (CONV-molecule-
 * boundary): Clipboard-Write + Timer beim Consumer (useCopyFeedback) — `state`
 * (idle/success/error) ist Prop, `onCopy` der Callback. data-ui je Story + je
 * Element (T01).
 * GF-351: Composition-Achse ergänzt (Icon/Tooltip-Slot-Kontext).
 */
import CopyButton from '../../../components/ui/molecules/CopyButton.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.30 Action/CopyButton',
  component: CopyButton,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    state: {
      control: 'inline-radio',
      options: ['idle', 'success', 'error'],
      description: 'Feedback-Zustand (idle → Copy, success → Check, error → AlertCircle).',
    },
    label: { control: 'text' },
    copiedLabel: { control: 'text' },
    errorLabel: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    state: 'idle',
    label: 'Kopieren',
    copiedLabel: 'Kopiert',
    errorLabel: 'Kopieren fehlgeschlagen',
    disabled: false,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — keine args, Komponenten-Defaults.
export const Default = {
  render: () => (
    <div data-ui="molecule.copy-button.default">
      <CopyButton onCopy={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — args-getriebener Copy-Button.
export const Main = {
  render: (args) => (
    <div data-ui="molecule.copy-button.main">
      <CopyButton {...args} onCopy={noop} />
    </div>
  ),
}

// Variant_States = idle (Copy) · success (Check) · error (AlertCircle, Danger) · gesperrt.
// Jede Achse mit eigenem data-ui zur 1:1-Ansprache.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.copy-button.states" className="flex items-center gap-4">
      <div data-ui="molecule.copy-button.idle">
        <CopyButton onCopy={noop} />
      </div>
      <div data-ui="molecule.copy-button.success">
        <CopyButton state="success" onCopy={noop} />
      </div>
      <div data-ui="molecule.copy-button.error">
        <CopyButton state="error" onCopy={noop} />
      </div>
      <div data-ui="molecule.copy-button.disabled">
        <CopyButton disabled onCopy={noop} />
      </div>
    </div>
  ),
}

// Variant_Composition: Icon/Tooltip-Slot-Kontext — CopyButton neben einem Code-Snippet
// oder URL-Feld (CopyButton.trigger ist das IconButton-Atom im Tooltip-Wrapper).
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.copy-button.composition" className="flex flex-col gap-4 max-w-sm">
      <div data-ui="molecule.copy-button.composition-code-row" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <code className="text-sm font-mono text-[var(--text)]">npm install devdash</code>
        <div data-ui="molecule.copy-button.composition-trigger">
          <CopyButton onCopy={noop} label="Befehl kopieren" />
        </div>
      </div>
      <div data-ui="molecule.copy-button.composition-url-row" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--subtext0)] truncate">https://devdash.familie-riedel.org/issues/DD-42</span>
        <div data-ui="molecule.copy-button.composition-url-trigger">
          <CopyButton state="success" onCopy={noop} copiedLabel="Link kopiert" />
        </div>
      </div>
    </div>
  ),
}
