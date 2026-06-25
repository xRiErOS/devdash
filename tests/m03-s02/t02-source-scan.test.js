import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-282 — Source-Scan-Tests (Pattern wie DD-276, weil @testing-library
// nicht installiert ist). Sichert Konventionen: H1 mit Projekt-Slug,
// data-ui-Slugs nach Mockup-v2-D04, AppShell-Route, Komponenten existieren.

const ROOT = resolve(import.meta.dirname, '../..')

function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

describe('T02 — DD-282 Komponenten + Routing + Slug-Convention', () => {
  // DD-368: Slug-basiertes Routing. ProjectHomeView ist jetzt unter
  // /:slug/home gemountet (statt /project/:id); der alte Pfad bleibt als
  // permanenter Legacy-Redirect (D07) erhalten.
  test('AppShell mountet ProjectHomeView auf /:slug/home (+ Legacy /project/:id)', () => {
    const s = src('src/views/AppShell.jsx')
    expect(s).toMatch(/path="home"/)
    expect(s).toMatch(/ProjectHomeView\.jsx/)
    // Legacy-Redirect für alte Deep-Links bleibt bestehen.
    expect(s).toMatch(/path="\/project\/:id"/)
  })

  test('ProjectHomeView importiert useActiveProject + useDocumentTitle (DD-276 Vertrag)', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).toMatch(/useActiveProject/)
    expect(s).toMatch(/useDocumentTitle/)
  })

  test('ProjectHomeView trägt den Slug im publizierten Seitentitel', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).toMatch(/activeProject\?\.slug/)
    // DD#82-r2: Der Page-Title wird nicht mehr inline gerendert, sondern via
    // usePageTitle(homeTitle) in den app-shell.sub-header publiziert. homeTitle
    // enthält den Slug (formatProjectHomeTitle → "PREFIX - NAME (slug)").
    expect(s).toMatch(/usePageTitle\(homeTitle\)/)
  })

  test('ProjectHomeView nutzt useSidebarCollapsed + useProjectHomeTab Hooks', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).toMatch(/useSidebarCollapsed/)
    expect(s).toMatch(/useProjectHomeTab/)
  })

  // DD-487 (B02): Breadcrumb-Dedupe — ProjectHomeView rendert KEINEN eigenen
  // Breadcrumb mehr; der App-Shell-ShellBreadcrumb (Layout.jsx) ist kanonisch.
  // 1:1 zur SOLL-Story (ProjectHome.stories rendert ohne breadcrumb-Slot).
  test('ProjectHomeView rendert KEINEN eigenen Breadcrumb mehr (B02-Dedupe)', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).not.toMatch(/data-ui="app\.header\.breadcrumb\.home"/)
    expect(s).not.toMatch(/data-ui="project-home\.breadcrumb\./)
    expect(s).not.toMatch(/breadcrumb=\{/)
  })

  // DD-472 T3 (Twin-Cutover): die folgenden 3 Source-Scan-Tests greppten die jetzt
  // archivierten Legacy-Twins (src/components/projectHome/{ProjectHomeTabs,
  // SettingsSidebar}.jsx) auf inline-style-/Slug-Literale ihrer alten Implementierung.
  // Mit dem Cutover auf die ui/organisms-Twins (call-site rewrite / state-lift in
  // ProjectHomeView) leben diese Literale nicht mehr im src/-Baum → die
  // dead-source-greps sind retired. Den Live-Render-Vertrag (Tab-/Sidebar-Anker)
  // sichert weiterhin t02-tabs-ssr.test.jsx gegen die ui/-Twins, plus die
  // e2e/m03-s01/t07-*-Specs gegen die laufende ProjectHomeView.

  // DD-468: old shell src/components/projectHome/ProjectHomeLayout.jsx deleted —
  // view recomposed onto canonical ui/templates/ProjectHomeLayout (DD-481).
  // B01-Fix: ProjectHomeView passes dataUiScope="project-home" → template emits
  // scope-qualified anchors (project-home.main-content, project-home.bottom-slot etc.)
  test('ProjectHomeLayout (canonical) setzt 3-Spalten-Grid + Bottom-Slot', () => {
    const s = src('src/components/ui/templates/ProjectHomeLayout.jsx')
    // Structural assertions (grid dimensions, span)
    expect(s).toMatch(/340px/)
    expect(s).toMatch(/48px/)
    expect(s).toMatch(/\[grid-column:1\/-1\]|gridColumn.*1.*-1|grid-column.*1.*-1/)
    // Semantic data-ui scope assertions — template emits ${dataUiScope}.<suffix>
    expect(s).toMatch(/`\$\{dataUiScope\}\.main-content`/)
    expect(s).toMatch(/`\$\{dataUiScope\}\.bottom-slot`/)
    expect(s).toMatch(/`\$\{dataUiScope\}\.content-grid`/)
    expect(s).toMatch(/`\$\{dataUiScope\}\.page-heading`/)
    expect(s).toMatch(/`\$\{dataUiScope\}\.breadcrumb`/)
  })

  test('ProjectHomeView setzt dataUiScope="project-home" am Layout (B01)', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).toMatch(/dataUiScope="project-home"/)
  })

  // DD-487 (T02): SOLL-Tab-Set = Overview/Backlog/Roadmap/Sstd/Memory (Todo +
  // Settings raus). Alle 5 Tab-Wrapper tragen role="tabpanel" + data-ui.
  test('Alle 5 SOLL-Tab-Komponenten haben role="tabpanel" + data-ui', () => {
    const tabs = ['Overview', 'Backlog', 'Roadmap', 'Sstd', 'Memory']
    for (const t of tabs) {
      const s = src(`src/components/ui/organisms/${t}Tab.jsx`)
      expect(s, `${t}Tab.jsx`).toMatch(/role="tabpanel"/)
      expect(s, `${t}Tab.jsx`).toMatch(/data-ui="project-home\./)
    }
  })

  // DD-487 (B04): Sessions/Terminal-Bottom-Slot entfernt — ProjectHomeView
  // verdrahtet slotRegistry/bottomSlot nicht mehr (nicht Teil der SOLL-Story).
  test('ProjectHomeView verdrahtet KEINEN Bottom-Slot mehr (B04)', () => {
    const s = src('src/views/ProjectHomeView.jsx')
    expect(s).not.toMatch(/slotRegistry/)
    expect(s).not.toMatch(/bottomSlot=\{/)
    expect(s).not.toMatch(/project-home\.bottom-slot/)
  })
})
