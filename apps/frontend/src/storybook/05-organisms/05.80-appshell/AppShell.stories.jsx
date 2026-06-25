/**
 * AppShell — Organism-Story (05.80 AppShell). 3-Zonen-App-Frame (Topbar + Rail +
 * Content-Outlet) als echte Komposition. Content ohne Padding → Inhalt füllt vollständig.
 *
 * GF-2 Schritt 6: kanonische Shell (draftVersion-Exploration kollabiert). Die 2 Rail-States
 * (expanded marker / collapsed icon-only) zeigt State_RailCollapsed.
 * status:review bis PO-Review (DD-186).
 */
import AppShell from '../../../components/ui/organisms/AppShell.jsx'
import AppShellRail from '../../../components/ui/organisms/AppShellRail.jsx'

const meta = {
  title: '05 ORGANISMS/05.80 AppShell/AppShell',
  component: AppShell,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:n/a', 'design_version:v2'],
  // fullBleed: kein Canvas-Padding → AppShell sitzt flush am Rand (wie echte App).
  parameters: { layout: 'fullscreen', fullBleed: true },
}
export default meta

const Outlet = () => (
  <div className="p-4 [font-family:var(--font-display)]">
    <h1 className="text-xl font-bold text-[var(--text)]">Content-Outlet</h1>
    <p className="mt-2 text-sm text-[var(--subtext1)]">Die Seite rastet hier ein und füllt den Raum (Content trägt selbst kein Padding).</p>
  </div>
)

export const Default = {
  render: () => (
    <div data-ui="organism.app-shell.default" className="h-full">
      <AppShell />
    </div>
  ),
}

export const Main = {
  render: () => (
    <div data-ui="organism.app-shell.main" className="h-full">
      <AppShell breadcrumb={['DevDash', 'Backlog']}>
        <Outlet />
      </AppShell>
    </div>
  ),
}

export const Variant_RailCollapsed = {
  name: 'Variant · Rail collapsed (icon-only)',
  render: () => (
    <div data-ui="organism.app-shell.rail-collapsed" className="h-full">
      <AppShell rail={<AppShellRail collapsed activeKey="backlog" />} breadcrumb={['DevDash', 'Backlog']}>
        <Outlet />
      </AppShell>
    </div>
  ),
}
