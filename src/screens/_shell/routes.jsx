// src/screens/_shell/routes.jsx
// Clean-Cut (DD2): Alle Prod-Views (src/views/*) wurden entfernt. Jede Route rendert
// vorerst einen Platzhalter. Screens werden aus dem Storybook-Samen promotet:
//   presentational Screen (Story) + dünner Connected-Wrapper (src/lib) + Route hier.
// AppShellFrame (Frame/Rail/Topbar) bleibt die handgepflegte Hülle.
import { Outlet, Route, Navigate } from 'react-router-dom'
import { AppShellFrame } from './AppShellFrame.jsx'

// Platzhalter bis der jeweilige Screen aus Storybook promotet ist.
function Stub({ name }) {
  return (
    <div data-ui={`screen:${name}.placeholder`} style={{ padding: 24, color: 'var(--subtext0)' }}>
      <strong>{name}</strong> — wird aus dem Storybook-Katalog promotet
    </div>
  )
}

// Pass-through bis ProjectScope (slug → project_id) neu aus Storybook promotet ist.
function ProjectScope() {
  return <Outlet />
}

export function buildRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/projects" replace />} />

      {/* AppShellFrame = pathless Layout über alle App-Shell-Routen. */}
      <Route element={<AppShellFrame />}>
        {/* App-/Tool-Ebene */}
        <Route path="/projects" element={<Stub name="projects-landing" />} />
        <Route path="/settings" element={<Stub name="global-settings" />} />
        <Route path="/settings/sops" element={<Stub name="sop-list" />} />
        <Route path="/settings/sops/:key" element={<Stub name="sop-view" />} />

        {/* projekt-scoped */}
        <Route path="/:slug" element={<ProjectScope />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Stub name="project-home" />} />
          <Route path="roadmap" element={<Stub name="roadmap" />} />
          <Route path="milestones" element={<Stub name="milestones-list" />} />
          <Route path="milestones/:id" element={<Stub name="milestone-detail" />} />
          <Route path="sprints" element={<Stub name="sprints-list" />} />
          <Route path="sprints/:id" element={<Stub name="sprint-detail" />} />
          <Route path="issues" element={<Stub name="issues-list" />} />
          <Route path="issues/:id" element={<Stub name="item-detail" />} />
          <Route path="backlog" element={<Stub name="backlog" />} />
          <Route path="review/:sprintId" element={<Stub name="sprint-review" />} />
          <Route path="memories" element={<Stub name="project-memory" />} />
          <Route path="settings" element={<Stub name="project-settings" />} />
          <Route path="board" element={<Navigate to="home" replace />} />
          <Route path="dependencies" element={<Navigate to="home" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </>
  )
}
