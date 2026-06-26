/**
 * FileItem — Anhang-/Datei-Zeile. Achsen: meta, actionIcon.
 * Komponiert Icon (führend) + IconButton (Aktion). 0 inline / 0 Hex.
 */
import FileItem from './FileItem.jsx'

const meta = {
  title: '03 MOLECULES/FileItem',
  component: FileItem,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    name: { control: 'text' },
    meta: { control: 'text' },
    actionIcon: { control: 'text' },
    actionLabel: { control: 'text' },
  },
  args: { name: 'design-spec.pdf', meta: '248 KB', actionIcon: 'download', actionLabel: 'Herunterladen' },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-sm">
      <FileItem {...args} dataUiScope="molecule.fileItem.default" />
    </div>
  ),
}

// Liste mehrerer Dateien — Ellipsierung + verschiedene Aktionen.
export const List = {
  render: () => (
    <div data-ui="molecule.fileItem.list" className="flex flex-col gap-[var(--space-1)] max-w-sm">
      <FileItem name="DESIGN.md" meta="12 KB" dataUiScope="molecule.fileItem.a" />
      <FileItem name="ein-sehr-langer-anhang-name-der-ellipsiert-werden-muss.png" meta="1.4 MB" dataUiScope="molecule.fileItem.b" />
      <FileItem name="entwurf.fig" meta="—" actionIcon="external" actionLabel="Öffnen" dataUiScope="molecule.fileItem.c" />
    </div>
  ),
}
