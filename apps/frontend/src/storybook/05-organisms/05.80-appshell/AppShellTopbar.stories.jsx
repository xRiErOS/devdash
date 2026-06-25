/**
 * AppShellTopbar — Organism-Story (05.80 AppShell). Top-Leiste eigenständig.
 * GF-2 Schritt 6: verdrahtete Kanon-Topbar (DD-Logo-Quick-Switcher + Breadcrumb +
 * controlled SearchField + Shortcuts + Theme). draftVersion-Exploration kollabiert.
 * status:review bis PO-Visual-Review (stable PO-exklusiv, DD-186).
 */
import AppShellTopbar from '../../../components/ui/organisms/AppShellTopbar.jsx'

const meta = {
  title: '05 ORGANISMS/05.80 AppShell/AppShellTopbar',
  component: AppShellTopbar,
  tags: ['status:review', 'qa_checklist:open', 'qa_behavioral:n/a', 'design_version:v2'],
  parameters: { layout: 'padded' },
}
export default meta

const noop = () => {}
const handlers = {
  onQuickSwitcher: noop,
  onShortcuts: noop,
  onThemeToggle: noop,
  onSearchChange: noop,
  onSearchClear: noop,
  onSearchSubmit: noop,
}

export const Default = {
  render: () => (
    <div data-ui="organism.app-shell-topbar.default">
      <AppShellTopbar {...handlers} />
    </div>
  ),
}

export const Main = {
  render: () => (
    <div data-ui="organism.app-shell-topbar.main">
      <AppShellTopbar {...handlers} breadcrumb={['DevDash', 'Backlog']} />
    </div>
  ),
}

export const Variant_SearchActive = {
  name: 'Variant · Search aktiv (Clear sichtbar)',
  render: () => (
    <div data-ui="organism.app-shell-topbar.search-active">
      <AppShellTopbar {...handlers} breadcrumb={['DevDash', 'DD-251']} searchValue="multi-tenant" />
    </div>
  ),
}

export const Variant_LightTheme = {
  name: 'Variant · Light-Theme (Moon-Icon)',
  render: () => (
    <div data-ui="organism.app-shell-topbar.light">
      <AppShellTopbar {...handlers} theme="light" breadcrumb={['DevDash', 'DD-251']} />
    </div>
  ),
}
