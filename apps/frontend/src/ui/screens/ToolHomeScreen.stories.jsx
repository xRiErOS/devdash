/**
 * ToolHomeScreen — globaler Lobby-Screen im AppShell-Kontext.
 * Presentational-Stories: alle Zustände über Props (kein MSW nötig).
 * Shell bei Pfad `/home` → Rail leer (D06: globaler Modus), Breadcrumb "DevDash".
 */
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { fn } from 'storybook/test'
import AppShellFrame from './AppShell.jsx'
import ToolHomeScreen from './ToolHomeScreen.jsx'
import { PROJECT_FIXTURES } from '../foundations/fixtures/projects.demo.js'

// Shell an `path` rendern, `content` im Outlet.
function shellAt(path, content) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShellFrame />}>
          <Route path="*" element={content} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

const meta = {
  title: '05 SCREENS/ToolHome',
  component: ToolHomeScreen,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

// 4 Projekte — Rail leer (globaler Modus), Breadcrumb "DevDash".
export const Default = {
  render: () =>
    shellAt(
      '/home',
      <ToolHomeScreen
        projects={PROJECT_FIXTURES}
        onProjectSelect={fn()}
        onCreateProject={fn()}
        dataUiScope="screen.toolHome.story.default"
      />,
    ),
}

// isLoading=true → 3× Skeleton-Card.
export const Loading = {
  render: () =>
    shellAt(
      '/home',
      <ToolHomeScreen
        isLoading
        onProjectSelect={fn()}
        onCreateProject={fn()}
        dataUiScope="screen.toolHome.story.loading"
      />,
    ),
}

// projects=[] → EmptyState + CTA.
export const Empty = {
  render: () =>
    shellAt(
      '/home',
      <ToolHomeScreen
        projects={[]}
        onProjectSelect={fn()}
        onCreateProject={fn()}
        dataUiScope="screen.toolHome.story.empty"
      />,
    ),
}

// 1 Projekt — kein Grid-Layout-Bruch bei einzelner Karte.
export const EinProjekt = {
  render: () =>
    shellAt(
      '/home',
      <ToolHomeScreen
        projects={[PROJECT_FIXTURES[0]]}
        onProjectSelect={fn()}
        onCreateProject={fn()}
        dataUiScope="screen.toolHome.story.einProjekt"
      />,
    ),
}
