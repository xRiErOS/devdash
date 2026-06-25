/**
 * IssueDetails — Screen-Story (08.60 Issues, GF-2 Plan-Sekundär). Promotion des
 * git-ignored Mockup-Drafts in die Insel: das IssueDetails-Organism (EntityDetail V2,
 * 06.60 Feature) eingerastet im kanonischen AppShell-Frame (05.80) = der reale Screen,
 * den die Route `/:slug/issues/:id` rendert.
 *
 * State hier präsentational (args-/fixture-getrieben) → qa_behavioral:n/a; die eigenen
 * Organism-Interaktionen (Description-Edit etc.) sind in 06.60 gehärtet. MemoryRouter-
 * Decorator hält den Screen-Kontext konsistent zum echten _shell + SprintReview-Pattern.
 * status:review bis PO (DD-186).
 */
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import IssueDetails from '../../../components/ui/organisms/IssueDetails.jsx'
import { ISSUE_DETAIL, ISSUE_MINIMAL } from './issueDetails.fixture.js'

const meta = {
  title: '08 SCREENS/08.60 Issues/IssueDetails',
  component: IssueDetails,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:n/a', 'domain:issues', 'design_version:v2'],
  parameters: { layout: 'fullscreen', fullBleed: true },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
}
export default meta

function IssueDetailsScreen({ name = 'main', data = ISSUE_DETAIL }) {
  return (
    <div data-ui={`screen.issue-details.${name}`} className="h-full">
      <AppShell breadcrumb={['DevDash', 'Backlog', data.id]}>
        <div data-ui="screen.issue-details.pane" className="h-full">
          <IssueDetails data={data} />
        </div>
      </AppShell>
    </div>
  )
}

// Root-Minimal: nur Header-Felder, Slots leer → Placeholder-Pfad (kein Crash).
export const Default = {
  render: (args, ctx) => <IssueDetailsScreen name={ctx.name} data={ISSUE_MINIMAL} />,
}

// Voll-Komposition: realistisches Issue (DD-251) mit allen Slots belegt.
export const Main = {
  render: (args, ctx) => <IssueDetailsScreen name={ctx.name} data={ISSUE_DETAIL} />,
}
