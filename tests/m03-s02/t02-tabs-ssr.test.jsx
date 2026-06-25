import { describe, test, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

// DD-343..346 (DD#47): Die Embed-Tabs (Backlog/Roadmap/Settings) ziehen jetzt echte
// Views, die transitiv den CodeMirror-Markdown-Editor (@retronav/ixora) importieren —
// im Node-Vitest-Env nicht auflösbar. Hier auf null gemockt: der SSR-Test prüft den
// Tab-Wrapper-Vertrag (role/data-ui), nicht den Inhalt der eingebetteten Views.
vi.mock('../../src/views/BacklogPage.jsx', () => ({ default: () => null }))
// DD-510 (DD#62): RoadmapTab embeddet jetzt das Spalten-Board (RoadmapBoard).
// Auf null gemockt → der SSR-Test prüft weiter nur den Tab-Wrapper-Vertrag.
vi.mock('../../src/views/RoadmapBoard.jsx', () => ({ default: () => null }))
vi.mock('../../src/views/ProjectSettings.jsx', () => ({ default: () => null }))
// DD-486: OverviewTab ist kein Stub mehr — es zieht echte Hooks (useProjectTodos,
// useActiveProject, useProjectNav) und Organisms (ProjectTodoList, Modals etc.)
// die im Node-SSR-Env ohne Router/Store nicht auflösbar wären.
// Hooks werden für den Wrapper-Vertrag-Test auf sichere Stubs gemockt.
vi.mock('../../src/hooks/useProjectTodos.js', () => ({
  useProjectTodos: () => ({
    todos: [], loading: false, error: null,
    create: () => {}, patch: () => {}, remove: () => {},
    reorder: () => {}, addLink: () => {}, removeLink: () => {},
  }),
}))
vi.mock('../../src/hooks/useActiveProject.js', () => ({
  useActiveProject: () => ({ project: null }),
  useDocumentTitle: () => {},
}))
vi.mock('../../src/lib/useProjectNav.js', () => ({
  useProjectNav: () => () => {},
}))
// DD-487 (T02): MemoryTab embeddet ProjectMemoryView → zieht apiClient/fetch +
// MemoryMasterDetail. Für den Tab-Wrapper-Vertrag-Test auf null gemockt (der Test
// prüft role/data-ui des Wrappers, nicht den Inhalt der eingebetteten View).
vi.mock('../../src/views/ProjectMemoryView.jsx', () => ({ default: () => null }))
// DD-472 T3 (Twin-Cutover): ProjectHomeTabs + SettingsSidebar repointed auf die
// kanonischen ui/organisms-Twins (Legacy nach _archive/). Die Twins sind
// präsentational: ProjectHomeTabs erwartet eine tabs-Array-Prop + dataUiScope;
// SettingsSidebar nimmt todos/settingsHref/dataUiScope statt Hook/Router. Die
// Live-View-Verdrahtung (HOME_TABS, dataUiScope="project-home.tabs|.sidebar")
// lebt in ProjectHomeView.jsx — hier wird der Render-Vertrag 1:1 nachgestellt.
import ProjectHomeTabs from '../../src/components/ui/organisms/ProjectHomeTabs.jsx'
import SettingsSidebar from '../../src/components/ui/organisms/SettingsSidebar.jsx'
import OverviewTab from '../../src/components/ui/organisms/OverviewTab.jsx'
import SstdTab from '../../src/components/ui/organisms/SstdTab.jsx'
import MemoryTab from '../../src/components/ui/organisms/MemoryTab.jsx'
import { TAB_IDS } from '../../src/hooks/useProjectHomeTab.js'

const noop = () => {}

// DD-472 T3: gleiche tabs-Array-Prop wie ProjectHomeView.HOME_TABS (TAB_IDS +
// Label-Override 'Memories'). 'memory'-Label nur zur Vollständigkeit; der SSR-Test
// prüft die Anker, nicht die Labels.
const TABS = TAB_IDS.map((id) => ({ id, label: id === 'memory' ? 'Memories' : undefined }))
const SCOPE = 'project-home.tabs'
const SIDEBAR_SCOPE = 'project-home.sidebar'

describe('T02 — Komponenten-Render via SSR', () => {
  describe('ProjectHomeTabs (ui/organisms-Twin, DD-472 T3)', () => {
    test('Desktop-Variante rendert alle SOLL-Tabs als role="tab" (DD-487/DD-666: 3 Tabs)', () => {
      const html = renderToStaticMarkup(
        <ProjectHomeTabs tabs={TABS} activeTab="overview" onSelect={noop} onToggleSidebar={noop} sidebarCollapsed={false} dataUiScope={SCOPE} />
      )
      // Twin-Schema: Tab-Buttons tragen ${scope}.tab.<id> (kanonisch, ProjectHome.stories).
      for (const id of TAB_IDS) {
        expect(html).toContain(`data-ui="project-home.tabs.tab.${id}"`)
      }
      expect(html).toContain('data-ui="project-home.tabs"')
      expect(html).toContain('data-ui="project-home.tabs.sidebar-toggle"')
    })

    test('Mobile-Variante rendert tabs.mobile statt Desktop', () => {
      const html = renderToStaticMarkup(
        <ProjectHomeTabs tabs={TABS} activeTab="overview" onSelect={noop} onToggleSidebar={noop} sidebarCollapsed={false} mobile dataUiScope={SCOPE} />
      )
      expect(html).toContain('data-ui="project-home.tabs.mobile"')
      expect(html).not.toContain('data-ui="project-home.tabs.sidebar-toggle"')
    })

    test('aria-selected entspricht activeTab', () => {
      // DD-666: roadmap ist kein Tab mehr — aktiver Tab = sstd.
      const html = renderToStaticMarkup(
        <ProjectHomeTabs tabs={TABS} activeTab="sstd" onSelect={noop} onToggleSidebar={noop} sidebarCollapsed={false} dataUiScope={SCOPE} />
      )
      // JSX-Attribut-Reihenfolge: aria-selected vor data-ui. Match das ganze Button-Tag.
      expect(html).toMatch(/<button[^>]+aria-selected="true"[^>]+data-ui="project-home\.tabs\.tab\.sstd"/)
      expect(html).toMatch(/<button[^>]+aria-selected="false"[^>]+data-ui="project-home\.tabs\.tab\.overview"/)
    })

    test('Sidebar-Toggle aria-pressed reflektiert collapsed-State', () => {
      const open = renderToStaticMarkup(
        <ProjectHomeTabs tabs={TABS} activeTab="overview" onSelect={noop} onToggleSidebar={noop} sidebarCollapsed={false} dataUiScope={SCOPE} />
      )
      const closed = renderToStaticMarkup(
        <ProjectHomeTabs tabs={TABS} activeTab="overview" onSelect={noop} onToggleSidebar={noop} sidebarCollapsed={true} dataUiScope={SCOPE} />
      )
      expect(open).toMatch(/aria-pressed="false"/)
      expect(closed).toMatch(/aria-pressed="true"/)
    })
  })

  describe('SettingsSidebar (ui/organisms-Twin, DD-472 T3)', () => {
    test('Expanded rendert alle 4 Stub-Sektionen', () => {
      // DD-472 T3: Twin ist präsentational — kein <Link>/Router mehr (semantisches
      // <a href={settingsHref}>), todos kommen als Prop. dataUiScope reproduziert
      // die Legacy-Anker (project-home.sidebar.*).
      const html = renderToStaticMarkup(
        <SettingsSidebar collapsed={false} projectName="DevD" todos={[]} settingsHref="/devd/settings" dataUiScope={SIDEBAR_SCOPE} />
      )
      expect(html).toContain('data-ui="project-home.sidebar.meta"')
      expect(html).toContain('data-ui="project-home.sidebar.dependency"')
      expect(html).toContain('data-ui="project-home.sidebar.quick-settings"')
      expect(html).toContain('data-ui="project-home.sidebar.todo-preview"')
      expect(html).toContain('DevD')
    })

    test('Collapsed rendert nur den Rail-Stub mit Project-Name', () => {
      const html = renderToStaticMarkup(<SettingsSidebar collapsed={true} projectName="DevD" dataUiScope={SIDEBAR_SCOPE} />)
      expect(html).toContain('data-ui="project-home.sidebar"')
      expect(html).not.toContain('data-ui="project-home.sidebar.meta"')
      expect(html).toContain('DevD')
    })
  })

  describe('Tab-Wrapper-Vertrag', () => {
    // DD-487 (T02): SOLL-Tab-Set — Todo + Settings raus, Memory rein.
    // DD-666: Backlog + Roadmap raus — SOLL-Tab-Set = overview/sstd/memory.
    test.each([
      ['Overview', OverviewTab, 'project-home.tabs.overview'],
      ['Sstd', SstdTab, 'project-home.tabs.sstd'],
      ['Memory', MemoryTab, 'project-home.tabs.memory'],
    ])('%sTab rendert tabpanel mit data-ui="%s"', (label, Comp, slug) => {
      const html = renderToStaticMarkup(<MemoryRouter><Comp /></MemoryRouter>)
      expect(html).toContain('role="tabpanel"')
      expect(html).toContain(`data-ui="${slug}"`)
    })

    // DD#47 (updated DD-486): SSTD-Renderer trägt eigene <h2>-Überschrift.
    // OverviewTab ist ab DD-486 kein Stub mehr — es ist ein voll-komposiertes
    // Layout-Panel ohne eigenen Heading (Heading lebt in der Card-Hierarchie),
    // daher hier entfernt.
    test.each([
      ['Sstd', SstdTab],
    ])('%sTab rendert eigene <h2>-Überschrift', (label, Comp) => {
      const html = renderToStaticMarkup(<MemoryRouter><Comp /></MemoryRouter>)
      expect(html).toContain('<h2')
    })

    // DD-546: Das „Quellen"/Sources-Panel (aside) ist NICHT Teil der SOLL und wurde
    // aus SstdTab entfernt. Weder der Anker noch der Panel-Titel dürfen mehr im
    // SSR-Output erscheinen.
    test('SstdTab rendert KEIN Sources-/Quellen-Panel mehr (DD-546)', () => {
      const html = renderToStaticMarkup(<MemoryRouter><SstdTab projectId={2} /></MemoryRouter>)
      expect(html).not.toContain('data-ui="project-home.tabs.sstd.sources"')
      expect(html).not.toContain('data-ui="project-home.tabs.sstd.sources-error"')
      expect(html).not.toContain('Quellen')
    })

    // DD-486 — OverviewTab SOLL-Komposition: Summary-Card muss im SSR-Output erscheinen.
    // Nagelt die voll-komposierte Struktur fest: tabpanel → overview-grid → summary-Card.
    // Anker 'project-home.summary' stammt direkt aus OverviewTab.jsx (SCOPE-Konstante +
    // Card data-ui={`${SCOPE}.summary`}) — nicht delegiert an ein Organism.
    test('OverviewTab SSR enthält project-home.summary (Kompositions-Anker)', () => {
      const html = renderToStaticMarkup(<MemoryRouter><OverviewTab /></MemoryRouter>)
      expect(html).toContain('data-ui="project-home.summary"')
    })
  })
})
