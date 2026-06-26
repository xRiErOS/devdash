/**
 * IssueDetails — Detail-Screen eines Issues. `Default` = Fixture (Contract),
 * `Populated` = reich befülltes Issue (alle Widgets sichtbar).
 * data-ui je Teil. 0 inline-style / 0 Raw-Hex.
 */
import IssueDetails from './IssueDetails.jsx'

const RICH = {
  key: 'DD2-7',
  title: 'Capture-Host Allowlist härten',
  type: 'core',
  status: 'refined',
  priority: 2,
  goal: 'Capture-PWA darf ausschließlich Issues anlegen — alles andere 403.',
  background: '`issues.*` liegt hinter Authelia; App-Guard prüft Host + Route gegen die Allowlist.',
  description: 'Host-Match case-insensitive, Allowlist zentral, neue PWA-Calls explizit freigeben.',
  attachments: [
    { id: 1, file_path: 'docs/capture-flow.png', created_at: 'PNG · 184 KB' },
    { id: 2, file_path: 'authelia-config.yml', created_at: 'YAML · 2 KB' },
  ],
  subtasks: [
    { id: 'AC-1', title: 'Allowlist-Host case-insensitive matchen', status: 'done' },
    { id: 'AC-2', title: 'Non-Capture-Routes liefern 403', status: 'done' },
    { id: 'AC-3', title: 'Regressionstest dd375 grün', status: 'open' },
    { id: 'AC-4', title: 'Doku im Security-Abschnitt ergänzt', status: 'open' },
  ],
}

const meta = {
  title: '05 SCREENS/IssueDetails',
  component: IssueDetails,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => (
  <div className="bg-[var(--base)] p-[var(--space-5)] min-h-screen">{children}</div>
)

// Contract: das echte Fixture (foundations/fixtures/issue.json), bewusst sparse.
export const Default = {
  render: () => <Frame><IssueDetails dataUiScope="screen.issueDetails.fixture" /></Frame>,
}

// Reich befüllt — alle Widgets mit Inhalt.
export const Populated = {
  render: () => <Frame><IssueDetails issue={RICH} dataUiScope="screen.issueDetails.rich" /></Frame>,
}
