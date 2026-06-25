/**
 * GF-261 — AssignDropZone (05.20 Actions, OR-15). Action „Drop something in Entity":
 * Drag-Ziel zum Issue-Zuweisen; komponiert ML-19 DropZone (GF-276, I06). Cluster-Move
 * 05.40 Boards → 05.20 Actions (PO 2026-06-18) — es ist eine Aktion, kein Board-Baustein.
 * Präsentational: Frame + controlled `active`-Visual; Payload-Verdrahtung in der
 * Realisierung (D09 Desktop).
 *
 * Ebene-6-Gegencheck (OR-15): keine gemined Capability → präsentational (_ebene6.md).
 * GF-355 — Active/Disabled → States gemergt (additive Wrapper per Instanz, LL21).
 */
import AssignDropZone from '../../../components/ui/organisms/AssignDropZone.jsx'

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.20 Actions/AssignDropZone',
  component: AssignDropZone,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Issue hierher ziehen',
    hint: 'Desktop-Drag — Touch deferred (D09)',
    active: false,
    disabled: false,
  },
}
export default meta

// Default: minimal/no-args — Komponente mit Default-Props (autodocs-Primary).
export const Default = {
  render: () => (
    <div data-ui="organism.assign-dropzone.default" className="max-w-sm">
      <AssignDropZone onActivate={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — explizit befüllter Realfall mit
// vollen Demo-Daten (entkoppelt von Default/meta-args).
export const Main = {
  render: () => (
    <div data-ui="organism.assign-dropzone.main" className="max-w-sm">
      <AssignDropZone
        label="Issue hierher ziehen"
        hint="Desktop-Drag — Touch deferred (D09)"
        active={false}
        disabled={false}
        onActivate={noop}
      />
    </div>
  ),
}

// Variant_States: Active (Drag schwebt darüber) + Disabled (nicht zuweisbar).
// Jede Instanz erhält einen additiven Wrapper-data-ui (LL21) — Component-Anker bleibt erhalten.
export const Variant_States = {
  render: () => (
    <div data-ui="organism.assign-dropzone.states" className="flex flex-col gap-4">
      <div data-ui="organism.assign-dropzone.state-active" className="max-w-sm">
        <AssignDropZone label="Loslassen zum Zuweisen" active onActivate={noop} />
      </div>
      <div data-ui="organism.assign-dropzone.state-disabled" className="max-w-sm">
        <AssignDropZone label="Zuweisen gesperrt" disabled />
      </div>
    </div>
  ),
}
