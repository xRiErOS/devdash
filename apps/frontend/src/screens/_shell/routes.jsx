// src/screens/_shell/routes.jsx
// MVP-Boot (DD2 AppShell): JEDE Route rendert vorerst einen Stub-Platzhalter —
// KEINE src/views/*-Imports (Clean-Cut gedroppt). Der Promote-Loop biegt einzelne
// Routen später vom Stub auf den echten Screen (z.B. roadmap → RoadmapBoardScreenConnected).
//
// AppShellFrame ist pathless Layout über ALLEN App-Shell-Routen (global + projekt-scoped).
// Statisches /home rankt über dynamisches /:slug. ProjectScope löst :slug → project_id
// SYNCHRON vor dem Kind-Render (X-Project-Id aus URL, DD-Review 2026-06-24).
import { Route, Navigate } from 'react-router-dom'
import { AppShellFrame } from './AppShellFrame.jsx'
import ProjectScope from './ProjectScope.jsx'
import Stub from './Stub.jsx'
import ToolHome from '../ToolHome/ToolHome.jsx'

export function buildRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/home" replace />} />

      <Route element={<AppShellFrame />}>
        {/* App-/Tool-Ebene (global, kein Projekt-Slug) */}
        <Route path="/home" element={<ToolHome />} />
        <Route path="/projects" element={<Navigate to="/home" replace />} />
        <Route path="/settings" element={<Stub name="global-settings" title="Einstellungen" />} />

        {/* projekt-scoped — ProjectScope setzt projectStore synchron aus :slug */}
        <Route path="/:slug" element={<ProjectScope />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Stub name="project-home" title="Home" />} />
          <Route path="roadmap" element={<Stub name="roadmap" title="Roadmap" />} />
          <Route path="milestones" element={<Stub name="milestones-list" title="Milestones" />} />
          <Route path="milestones/:id" element={<Stub name="milestone-detail" title="Milestone" />} />
          <Route path="sprints" element={<Stub name="sprints-list" title="Sprints" />} />
          <Route path="sprints/:id" element={<Stub name="sprint-detail" title="Sprint" />} />
          <Route path="issues" element={<Stub name="issues-list" title="Issues" />} />
          <Route path="issues/:id" element={<Stub name="issue-detail" title="Issue" />} />
          <Route path="backlog" element={<Stub name="backlog" title="Backlog" />} />
          <Route path="review/:sprintId" element={<Stub name="sprint-review" title="Sprint-Review" />} />
          <Route path="memories" element={<Stub name="project-memories" title="Memories" />} />
          <Route path="settings" element={<Stub name="project-settings" title="Projekt-Einstellungen" />} />
          {/* gedroppt: board / dependencies → auf home umleiten, kein 404-Loch */}
          <Route path="board" element={<Navigate to="home" replace />} />
          <Route path="dependencies" element={<Navigate to="home" replace />} />
        </Route>
      </Route>

      {/* Catch-all → /home */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </>
  )
}
