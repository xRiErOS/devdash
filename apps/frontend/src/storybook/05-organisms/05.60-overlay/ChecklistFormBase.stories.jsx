/**
 * ChecklistFormBase — Organism-Story (05.60 Overlay). Präsentationale Grundlage für
 * erfassende Formulare: Modal-Shell (blur+Border) + Feld-Region (children) +
 * Speichern/Abbrechen-Footer. Default = create-Modus (ohne Meta); WithMeta = edit-Modus
 * (idTag + Timestamps). Inhaltsagnostisch — Felder hier nur Demo-Platzhalter.
 */
import ChecklistFormBase from '../../../components/ui/organisms/ChecklistFormBase.jsx'

const noop = () => {}

// Demo-Feld-Region (der konkrete Form-Organismus liefert echte Felder).
function DemoFields() {
  return (
    <label data-ui="demo.field" className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.05em] text-[var(--subtext0)]">
      <span>Titel</span>
      <input
        defaultValue="Beispiel-Kriterium"
        className="px-3 py-2.5 bg-[var(--base)] text-[var(--text)] border border-[var(--surface2)] rounded-[var(--radius-sm)] text-base outline-none normal-case tracking-normal"
      />
    </label>
  )
}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/ChecklistFormBase',
  component: ChecklistFormBase,
  tags: ['status:stable', 'qa_behavioral:n/a', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// Default: create-Modus — kein idTag, keine Timestamps.
export const Default = {
  render: () => (
    <div data-ui="organism.checklist-form.default">
      <ChecklistFormBase open onClose={noop} onSave={noop} headerLabel="Eintrag erfassen">
        <DemoFields />
      </ChecklistFormBase>
    </div>
  ),
}

// Main: edit-Modus — idTag + Timestamps im Footer (maßgeblicher, voll befüllter Hauptfall).
export const Main = {
  name: 'Main',
  render: () => (
    <div data-ui="organism.checklist-form.with-meta">
      <ChecklistFormBase
        open
        onClose={noop}
        onSave={noop}
        headerLabel="Eintrag bearbeiten"
        idTag="devd:demo:7"
        timestamps={{ created_at: '2026-06-19T10:00:00Z', updated_at: '2026-06-19T11:00:00Z' }}
      >
        <DemoFields />
      </ChecklistFormBase>
    </div>
  ),
}
