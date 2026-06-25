/**
 * GF-242 — ModalShell (04.60 Overlay, ML-17). Der dumb Slot-Frame für Overlays:
 * Backdrop + zentriertes Panel + Header/Body/Footer-Slots + ESC/Backdrop-Close.
 *
 * extract-move (D06): islandisiert das bestehende `Modal`-Primitiv (Modal.jsx) —
 * die Komponente bleibt geteilt (Consumer modal.test.jsx, ChecklistDetailModal),
 * der Archiv-Twin `90 Archive/Molecules/Overlays/Modal` wird git-rm.
 *
 * Dumb (Q-S2 / D05): KEINE Daten, KEIN internes open-State — `open` ist Prop,
 * `onClose` der Callback (ESC/Backdrop feuern nur den Callback). Mit echter
 * Open/Close- oder Lifecycle-Logik wäre der Consumer ein Organism.
 */
import Modal from '../../../components/ui/molecules/Modal.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'
import IconButton from '../../../components/ui/atoms/IconButton.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.60 Overlay/ModalShell',
  component: Modal,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    align: { control: 'inline-radio', options: ['center', 'top'] },
    open: { control: 'boolean' },
    headerless: { control: 'boolean' },
  },
  args: {
    open: true,
    title: 'Sprint abschließen',
    size: 'md',
    align: 'center',
    headerless: false,
  },
}
export default meta

// Default: minimaler no-args/Default-Props-Zustand — leerer Frame ohne Titel,
// Footer oder Demo-Body (nur `open` ist strukturell nötig, sonst rendert nichts).
export const Default = {
  args: { open: true, title: undefined, headerless: true },
  render: (args) => (
    <div data-ui="molecule.modal-shell.default">
      <Modal {...args} onClose={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Frame mit Titel-Header, Body-Slot und
// Footer-Slot. Klon des Default-Render (kein eigener realistischer Hauptfall).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.modal-shell.main">
      <Modal
        {...args}
        onClose={noop}
        footer={
          <>
            <Button variant="ghost" onClick={noop}>Abbrechen</Button>
            <Button variant="primary" onClick={noop}>Abschließen</Button>
          </>
        }
      >
        <p>Slot-Frame: Header (Titel) · Body (dieser Inhalt) · Footer (Aktionen).
        Daten und Open/Close-Logik liegen beim Consumer (D05).</p>
      </Modal>
    </div>
  ),
}

// Variant_Composition: Header mit Close-IconButton (headerActions) + Body + Footer.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.modal-shell.composition">
      <Modal
        open
        title="Issue verschieben"
        size="lg"
        onClose={noop}
        headerActions={
          <IconButton
            icon={<Icon name="close" size={16} />}
            label="Schließen"
            onClick={noop}
            size="sm"
            variant="ghost"
          />
        }
        footer={
          <>
            <Button variant="ghost" onClick={noop}>Abbrechen</Button>
            <Button variant="primary" onClick={noop}>Verschieben</Button>
          </>
        }
      >
        <p>Der Header-Slot trägt rechts einen Close-IconButton (headerActions),
        der Footer eine Aktionsleiste. Beide sind reine Slots.</p>
      </Modal>
    </div>
  ),
}

// Variant_Headerless: kein Header-Frame — der Body-Slot bringt seinen eigenen
// Kopf mit (z.B. Command-Palette, align="top").
export const Variant_Headerless = {
  render: () => (
    <div data-ui="molecule.modal-shell.headerless">
      <Modal open headerless align="top" size="md" onClose={noop}>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Befehl suchen…"
            className="w-full rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <p className="text-xs text-[var(--subtext0)]">Headerless: der Inhalt steuert seinen eigenen Kopf.</p>
        </div>
      </Modal>
    </div>
  ),
}
