/**
 * GF-250-Muster — TransferDialog (05.60 Overlay, OR-11). Overlay zum Kopieren/
 * Exportieren der (gefilterten) Liste: Format-Tabs (MD/CSV/JSON) + Vorschau +
 * CopyButton (GF-237) + Download. Stateful nur bzgl. Format; dumb bzgl. Daten.
 *
 * Ebene-6 (OR-11) — Gegencheck (kein Coverage-Gap): Export-Capability PRESENT —
 * GET /api/sprints/:id/export (server/api.js:3418) + GET /api/backlog-export
 * (:3485), md/csv; MCP devd_backlog_export. Clipboard/Download beim Consumer.
 *
 * data-ui je Wrapper + Format-Tab + Preview + Copy + Download (PO-Ansprechbarkeit, T01).
 */
import TransferDialog from '../../../components/ui/organisms/TransferDialog.jsx'

const noop = () => {}

const previews = {
  md: '# Backlog\n\n- [ ] DD-42 · Status-Transitions absichern (active)\n- [ ] DD-43 · Audit-Log-Eintrag (new)',
  csv: 'id,title,status\nDD-42,Status-Transitions absichern,active\nDD-43,Audit-Log-Eintrag,new',
  json: '[\n  { "id": "DD-42", "status": "active" },\n  { "id": "DD-43", "status": "new" }\n]',
}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/TransferDialog',
  component: TransferDialog,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    copyState: { control: 'inline-radio', options: ['idle', 'success', 'error'] },
    previews: { control: false },
  },
  args: {
    open: true,
    copyState: 'idle',
    previews,
    value: { format: 'md' },
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (no-args) — Komponente ohne Demo-Daten.
export const Default = {
  args: {
    open: undefined,
    copyState: undefined,
    previews: undefined,
    value: undefined,
  },
  render: (args) => (
    <div data-ui="organism.transfer-dialog.default">
      <TransferDialog {...args} onClose={noop} onCopy={noop} onDownload={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.transfer-dialog.main">
      <TransferDialog {...args} onClose={noop} onCopy={noop} onDownload={noop} />
    </div>
  ),
}

// Variants = die drei Export-Formate, jeweils mit aktivem Tab + passender Vorschau.
export const Variant_All = {
  render: () => (
    <div data-ui="organism.transfer-dialog.variants" className="flex flex-col gap-8">
      <div data-ui="organism.transfer-dialog.variant-md">
        <TransferDialog open previews={previews} value={{ format: 'md' }} onClose={noop} onCopy={noop} onDownload={noop} />
      </div>
      <div data-ui="organism.transfer-dialog.variant-csv">
        <TransferDialog open previews={previews} value={{ format: 'csv' }} onClose={noop} onCopy={noop} onDownload={noop} />
      </div>
      <div data-ui="organism.transfer-dialog.variant-json">
        <TransferDialog open previews={previews} value={{ format: 'json' }} onClose={noop} onCopy={noop} onDownload={noop} />
      </div>
    </div>
  ),
}
