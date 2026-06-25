/**
 * AppShellRail — Organism-Story (05.80 AppShell). Icon-Navigations-Rail eigenständig.
 * GF-2 Schritt 6: kanonische 2 States (collapsed icon-only ↔ expanded marker-Rail),
 * draftVersion-Exploration kollabiert. Toggle unten-rechts (app-shell.rail.toggle).
 * status:review bis PO-Visual-Review (stable PO-exklusiv, DD-186).
 */
import AppShellRail from '../../../components/ui/organisms/AppShellRail.jsx'

const meta = {
  title: '05 ORGANISMS/05.80 AppShell/AppShellRail',
  component: AppShellRail,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:n/a', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[420px] bg-[var(--crust)] p-2"><Story /></div>],
}
export default meta

export const Default = {
  render: () => (
    <div data-ui="organism.app-shell-rail.default" className="h-full">
      <AppShellRail />
    </div>
  ),
}

export const Main = {
  render: () => (
    <div data-ui="organism.app-shell-rail.main" className="h-full">
      <AppShellRail activeKey="home" />
    </div>
  ),
}

export const Variant_Expanded = {
  name: 'Variant · Expanded (marker-Rail, Kanon)',
  render: () => (
    <div data-ui="organism.app-shell-rail.expanded" className="h-full">
      <AppShellRail collapsed={false} activeKey="backlog" />
    </div>
  ),
}

export const Variant_Collapsed = {
  name: 'Variant · Collapsed (icon-only)',
  render: () => (
    <div data-ui="organism.app-shell-rail.collapsed" className="h-full">
      <AppShellRail collapsed activeKey="backlog" />
    </div>
  ),
}
