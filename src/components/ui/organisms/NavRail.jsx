/**
 * NavRail — angedockte vertikale Navigation Rail für iPad-Landscape (DD-633,
 * F1 Slice C / FSD T02).
 *
 * Tablet-Persona der adaptiven App-Shell, eingeblendet im Breakpoint-Fenster
 * lg..xl (1024–1280): auf <lg übernimmt die BottomTabBar (Phone), ab xl die
 * volle Desktop-Sidebar (IconSidebar). Anders als der frühere Floating-Drawer
 * ist die Rail fest angedockt (kein Overlay).
 *
 * PRESENTATIONAL: kein react-router, kein Store, kein fetch. Teilt den exakten
 * Props-Vertrag der IconSidebar (items/footerItems/activeKey/onNavigate/project/
 * onProjectSwitch) und reuset deren presentational `SidebarBody` (Projekt-Badge
 * + Nav-Icons + Footer) — so bleibt die Navigations-Wahrheit single-source. Der
 * eigene `dataUiScope` (Default `app-shell.nav-rail`) trennt die Anker von der
 * Sidebar im Architektur-Modell.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,icon:React.ReactNode,testId?:string}>} [props.items] - Haupt-Nav-Einträge
 * @param {Array<{key:string,label:string,icon:React.ReactNode,testId?:string}>} [props.footerItems] - untere Gruppe (z.B. Settings)
 * @param {string} [props.activeKey] - key des aktiven Eintrags
 * @param {(key:string)=>void} [props.onNavigate] - Klick/Enter auf einen Nav-Eintrag
 * @param {object} [props.project] - aktives Projekt: { name, prefix, color }
 * @param {()=>void} [props.onProjectSwitch] - Klick auf das Projekt-Badge
 * @param {string} [props.dataUiScope='app-shell.nav-rail'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { SidebarBody } from './IconSidebar.jsx'

export default function NavRail({
  items = [],
  footerItems = [],
  activeKey,
  onNavigate,
  project,
  onProjectSwitch,
  dataUiScope = 'app-shell.nav-rail',
  className = '',
}) {
  return (
    <aside
      className={`hidden lg:flex xl:hidden flex-col w-16 h-screen sticky top-0 shrink-0 bg-[var(--mantle)] border-r border-[var(--surface0)] ${className}`}
      aria-label="Navigation"
      data-ui={dataUiScope}
    >
      <SidebarBody
        items={items}
        footerItems={footerItems}
        activeKey={activeKey}
        onNavigate={onNavigate}
        project={project}
        onProjectSwitch={onProjectSwitch}
        scope={dataUiScope}
      />
    </aside>
  )
}
