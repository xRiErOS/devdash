/**
 * DetailLayout — geteilte Content-Wahrheit. Komponiert PageTitle + Widget-Grid.
 * Hier mit Beispiel-Widgets befüllt. data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import DetailLayout from './DetailLayout.jsx'
import TextWidget from '../organisms/complex/TextWidget.jsx'
import AttachmentWidget from '../organisms/complex/AttachmentWidget.jsx'
import ChecklistWidget from '../organisms/complex/ChecklistWidget.jsx'

const meta = {
  title: '05 SCREENS/DetailLayout',
  component: DetailLayout,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Default = {
  render: () => (
    <div data-ui="screen.detailLayout.frame" className="bg-[var(--base)] p-[var(--space-5)] min-h-screen">
      <DetailLayout
        dataUiScope="screen.detailLayout.default"
        title={{
          kind: 'issue', id: 'DD2-7', name: 'Capture-Host Allowlist härten',
          status: 'refined', statusLabel: 'Refined', meta: ['core', 'P2', '3 Subtasks'],
        }}
      >
        <TextWidget value={{ goal: 'Ziel-Satz.', description: 'Beschreibung.' }} dataUiScope="screen.detailLayout.default.text" />
        <AttachmentWidget files={[{ name: 'a.png', meta: 'PNG · 12 KB' }]} dataUiScope="screen.detailLayout.default.attach" />
        <ChecklistWidget items={[{ id: 'AC-1', name: 'Kriterium A', done: true }, { id: 'AC-2', name: 'Kriterium B', done: false }]} dataUiScope="screen.detailLayout.default.checks" />
      </DetailLayout>
    </div>
  ),
}
