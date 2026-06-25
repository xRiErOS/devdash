/**
 * IconSidebar — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/IconSidebar.jsx, DD-46/DD-63/DD-194/DD-282/DD-463).
 *
 * Domänen-bewusste Einheit: die App-Shell-Navigations-Sidebar (Desktop-Icon-Rail
 * mit aktivem Link, Projekt-Switch-Badge, optionalem Theme-Toggle). Komponiert
 * das Atom Tooltip (Hover-Label je Nav-Eintrag).
 *
 * DD-534 (F1 Slice A): der frühere Mobile-Floating-Drawer (Burger + Scrim +
 * Slide-Aside) ist entfernt — auf <lg übernimmt die BottomTabBar (Layout) die
 * Primärnavigation. Diese Sidebar rendert nur noch das Desktop-Aside (lg:flex).
 *
 * PRESENTATIONAL (D-Phase3-01): kein react-router, kein projectStore, kein
 * fetch, kein useEffect-Datenladen. Gehobene Kopplung gegenüber der Quelle:
 *  - `react-router` (`Link`/`useLocation`/`useParams`) + die `p(view)`-Slug-
 *    Pfadberechnung → die Navigations-Struktur kommt jetzt als `items=[]`-Prop
 *    (jedes Item { key, label, icon, testId? }). Der aktive Eintrag wird über
 *    `activeKey` bestimmt (statt `loc.pathname`-Vergleich). Klick auf einen
 *    Eintrag ruft `onNavigate(key)` — der Konsument mappt key→route und
 *    navigiert selbst. `footerItems=[]` deckt die untere Gruppe (Trash/Settings).
 *  - `CompactProjectSwitcher` (vorher `fetch('/api/projects')` + projectStore-
 *    `getActiveProjectId`/`subscribeProject` + `dispatchEvent`) → `project`-Prop
 *    ({ name, prefix, color }) + `onProjectSwitch`-Callback. Die dynamische
 *    `project.color` ist über die CSS-Custom-Property `--badge-bg` als statische
 *    Tailwind-Klasse `bg-[var(--badge-bg)]` token-clean gelöst — gesetzt via
 *    `style`-freiem Inline-Var-Mechanismus über die `colorVar`-Map am Wurzel
 *    (kein inline-style; Default-Fallback `--overlay0`).
 *  - Theme-State (`getInitialTheme` + `localStorage` + `useEffect`-DOM-Attribut)
 *    → `theme`-Prop ('light'|'dark') + `onToggleTheme`-Callback. Der Konsument
 *    persistiert + setzt `data-theme` am `<html>`.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,icon:React.ReactNode,testId?:string}>} [props.items] - Haupt-Nav-Einträge (Reihenfolge = Render-Reihenfolge)
 * @param {Array<{key:string,label:string,icon:React.ReactNode,testId?:string}>} [props.footerItems] - untere Nav-Gruppe (z.B. Trash/Settings)
 * @param {string} [props.activeKey] - key des aktiven Eintrags (Highlight)
 * @param {(key:string)=>void} [props.onNavigate] - Klick/Enter auf einen Nav-Eintrag
 * @param {object} [props.project] - aktives Projekt: { name, prefix, color }
 * @param {()=>void} [props.onProjectSwitch] - Klick auf das Projekt-Badge (Switcher öffnen)
 * @param {'light'|'dark'} [props.theme='light'] - aktuelles Theme (Icon-Auswahl)
 * @param {()=>void} [props.onToggleTheme] - Theme umschalten
 * @param {string} [props.dataUiScope='icon-sidebar'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { Moon, Sun } from 'lucide-react'
import Tooltip from '../atoms/Tooltip.jsx'
import DDLogo from '../atoms/DDLogo.jsx'

// Ein Nav-Icon-Link. Token-clean, ohne Router — Klick delegiert an onNavigate(key).
function NavItem({ item, active, scope, onNavigate }) {
  return (
    <Tooltip label={item.label} placement="bottom">
      <button
        type="button"
        onClick={() => onNavigate?.(item.key)}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        data-ui={`${scope}.nav.${item.key}`}
        data-testid={item.testId}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          active
            ? 'bg-[var(--surface1)] text-[var(--text)]'
            : 'text-[var(--subtext0)] hover:bg-[var(--surface1)]'
        }`}
      >
        {item.icon}
      </button>
    </Tooltip>
  )
}

// Die eigentliche Nav-Body (Projekt-Badge + Nav-Icons + Footer). Presentational,
// wiederverwendet von der Desktop-Sidebar (hier) UND der iPad-NavRail (DD-633
// Slice C, NavRail.jsx) — daher named export.
export function SidebarBody({
  items,
  footerItems,
  activeKey,
  onNavigate,
  onProjectSwitch,
  theme,
  onToggleTheme,
  scope,
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-2 pt-3 px-2">
        {/* DD-664: DD-Logo aus dem Page-Header in den Projekt-Switcher-Bereich der
            Sidebar/NavRail verlagert — gibt dem Header vertikalen Platz frei. Klick
            öffnet den Quick-Switcher (onProjectSwitch), genau wie der q-Shortcut.
            size=24 passt in die schmale w-16-Rail ohne Overflow. DD-664 (r3): das
            separate Projekt-Badge (project-switcher-Anker) ist entfernt — es war
            doppelt zum Logo+q (PO-Reject Runde 2). */}
        <DDLogo
          onClick={onProjectSwitch}
          size={24}
          label="Quick-Switcher öffnen (q)"
          data-ui={`${scope}.logo`}
        />
        <div className="h-px w-8 my-1 bg-[var(--surface0)]" />
        {items.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={item.key === activeKey}
            scope={scope}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pb-3 px-2">
        {footerItems.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={item.key === activeKey}
            scope={scope}
            onNavigate={onNavigate}
          />
        ))}
        {/* DD-498 (D04): Theme-Toggle nur rendern, wenn der Konsument ihn hier will.
            Im SOLL lebt er im Header — die Shell übergibt dann kein onToggleTheme. */}
        {onToggleTheme && (
          <>
            <div className="h-px w-8 my-1 bg-[var(--surface0)]" />
            <button
              type="button"
              onClick={onToggleTheme}
              data-ui={`${scope}.theme-toggle`}
              aria-label={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-[var(--subtext0)] hover:bg-[var(--surface1)]"
            >
              {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
            </button>
          </>
        )}
      </div>
    </>
  )
}

export default function IconSidebar({
  items = [],
  footerItems = [],
  activeKey,
  onNavigate,
  project,
  onProjectSwitch,
  theme = 'light',
  onToggleTheme,
  dataUiScope = 'icon-sidebar',
  className = '',
}) {
  // DD-534: nur noch das Desktop-Aside. Auf <lg übernimmt die BottomTabBar
  // (Layout); im iPad-Landscape-Fenster lg..xl die NavRail (DD-633 Slice C) —
  // daher ist die volle Desktop-Sidebar erst ab xl (≥1280) sichtbar.
  return (
    <aside
      className={`hidden xl:flex flex-col w-16 h-screen sticky top-0 shrink-0 bg-[var(--mantle)] border-r border-[var(--surface0)] ${className}`}
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
        theme={theme}
        onToggleTheme={onToggleTheme}
        scope={dataUiScope}
      />
    </aside>
  )
}
