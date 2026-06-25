/**
 * GF-2 — MasterDetailScreen (07 Templates). Page-Archetyp OHNE Domänenwissen: seiten-breiter
 * PageTitle (EntityDetailHeader, size="page") über einem Master-Detail (Listen-Sidebar +
 * Detail-Pane). Aus dem Sprint/Issue-Review-Screen extrahiert, wiederverwendbar für gleichartige
 * Review-/Workflow-Screens (z.B. Memory-Review). Reine Slots — der Consumer füllt Sidebar + Detail.
 */
import MasterDetailScreen from '../../components/ui/templates/MasterDetailScreen.jsx'
import Button from '../../components/ui/atoms/Button.jsx'

const meta = {
  title: '07 TEMPLATES/MasterDetailScreen',
  component: MasterDetailScreen,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Placeholder = ({ label }) => (
  <div className="rounded-md border border-[var(--border)] bg-[var(--surface0)] p-3 text-sm text-[var(--subtext0)]">{label}</div>
)

const demoSidebar = (
  <div className="flex h-full flex-col gap-2 p-2">
    <Placeholder label="Suche / Filter (Slot)" />
    <Placeholder label="Listen-Eintrag A" />
    <Placeholder label="Listen-Eintrag B" />
    <Placeholder label="Listen-Eintrag C" />
    <div className="mt-auto pt-2">
      <Button variant="primary" size="sm" className="w-full">Footer-Aktion (Slot)</Button>
    </div>
  </div>
)

const demoDetail = (
  <div className="flex flex-col gap-2">
    <Placeholder label="Detail-Header (Slot)" />
    <Placeholder label="Detail-Inhalt / Widgets (Slot)" />
  </div>
)

const demoHeader = {
  id: 'ENT-1',
  title: 'Master-Detail Screen',
  goal: 'Generischer Page-Archetyp: PageTitle (size=page) über Master-Detail. Domänenfrei.',
  pills: [
    { k: 'a', label: 'Status', value: 'Beispiel', tone: 'teal' },
    { k: 'b', label: 'Fortschritt', value: '1/3', tone: 'green' },
  ],
  action: <Button variant="ghost" size="sm">Header-Aktion</Button>,
}

export const Default = {
  render: () => (
    <div data-ui="template.master-detail-screen.default" className="h-[720px]">
      <MasterDetailScreen header={demoHeader} sidebar={demoSidebar} detail={demoDetail} />
    </div>
  ),
}

// SidebarMantle: alternative Sidebar-Fläche (Chrome-Variante der Canon-Leiter).
export const SidebarMantle = {
  render: () => (
    <div data-ui="template.master-detail-screen.sidebar-mantle" className="h-[720px]">
      <MasterDetailScreen header={demoHeader} sidebar={demoSidebar} detail={demoDetail} sidebarSurface="mantle" />
    </div>
  ),
}
