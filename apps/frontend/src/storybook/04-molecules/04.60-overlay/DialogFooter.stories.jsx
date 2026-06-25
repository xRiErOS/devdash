/**
 * GF-243 — DialogFooter (04.60 Overlay, ML-18). Dialog-Aktionsleiste: Button-Slot,
 * per Default rechtsbündig (align end/between/start). Paart mit ModalShell
 * (footer-Slot) oder standalone.
 *
 * Dumb (CONV-molecule-boundary): reiner Slot — Buttons + Callbacks vom Consumer.
 */
import DialogFooter from '../../../components/ui/molecules/DialogFooter.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.60 Overlay/DialogFooter',
  component: DialogFooter,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    align: { control: 'inline-radio', options: ['end', 'between', 'start'] },
  },
  args: { align: 'end' },
}
export default meta

// Default: minimaler Default-Props-Zustand — leerer Footer mit Default-align.
export const Default = {
  render: (args) => (
    <div data-ui="molecule.dialog-footer.default" className="max-w-lg rounded-lg border border-[var(--surface1)]">
      <DialogFooter {...args} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Abbrechen (ghost) + Bestätigen (primary),
// rechtsbündig. Klon des Default-Render (kein eigener realistischer Hauptfall).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.dialog-footer.main" className="max-w-lg rounded-lg border border-[var(--surface1)]">
      <DialogFooter {...args}>
        <Button variant="ghost" onClick={noop}>Abbrechen</Button>
        <Button variant="primary" onClick={noop}>Bestätigen</Button>
      </DialogFooter>
    </div>
  ),
}

// Variant_All: alle drei align-Werte nebeneinander — jede Variante in eigenem
// additivem Wrapper (LL21: Component-Anker dialog-footer bleibt erhalten).
export const Variant_All = {
  render: () => (
    <div data-ui="molecule.dialog-footer.variants" className="flex flex-col gap-3">
      <div data-ui="molecule.dialog-footer.variant-end" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogFooter align="end">
          <Button variant="ghost" onClick={noop}>Abbrechen</Button>
          <Button variant="primary" onClick={noop}>Bestätigen</Button>
        </DialogFooter>
      </div>
      <div data-ui="molecule.dialog-footer.variant-between" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogFooter align="between">
          <Button variant="ghost" onClick={noop}>Hilfe</Button>
          <Button variant="primary" onClick={noop}>Speichern</Button>
        </DialogFooter>
      </div>
      <div data-ui="molecule.dialog-footer.variant-start" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogFooter align="start">
          <Button variant="ghost" onClick={noop}>Zurück</Button>
          <Button variant="primary" onClick={noop}>Weiter</Button>
        </DialogFooter>
      </div>
    </div>
  ),
}

// Variant_Composition: destruktive Aktion (danger) + between-Ausrichtung (Hilfe
// links, Aktionen rechts).
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.dialog-footer.composition" className="flex flex-col gap-3">
      <div data-ui="molecule.dialog-footer.danger-wrap" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogFooter data-ui="molecule.dialog-footer.danger">
          <Button variant="ghost" onClick={noop}>Abbrechen</Button>
          <Button variant="danger" onClick={noop}>Löschen</Button>
        </DialogFooter>
      </div>
      <div data-ui="molecule.dialog-footer.between-wrap" className="max-w-lg rounded-lg border border-[var(--surface1)]">
        <DialogFooter data-ui="molecule.dialog-footer.between" align="between">
          <Button variant="ghost" onClick={noop}>Hilfe</Button>
          <Button variant="primary" onClick={noop}>Speichern</Button>
        </DialogFooter>
      </div>
    </div>
  ),
}
