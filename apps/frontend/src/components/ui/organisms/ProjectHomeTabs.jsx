/**
 * ProjectHomeTabs — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/ProjectHomeTabs.jsx, DD-282 R4 / M3-S02 T02).
 *
 * Domänen-bewusste Einheit: die Tab-Leiste der Projekt-Home-Ansicht
 * (overview/backlog/roadmap/todo/sstd/settings) mit aktivem Unterstrich,
 * optionalen Count-Badges je Tab und einem Sidebar-Collapse-Toggle. Liefert
 * zwei Layouts: Desktop (horizontale Leiste mit Toggle rechts) und Mobile
 * (fixierte Bottom-Tab-Bar, 44px Touch-Targets, kein Toggle). Komponiert die
 * Atoms TabButton + TabIcon.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle importierte `TAB_IDS` aus `../../hooks/useProjectHomeTab.js`
 *    (Routing-/Tab-State-Kopplung). Die Tab-Liste kommt hier als reine
 *    `tabs`-Prop ([{ id, label?, icon? }]); der aktive Tab als `activeTab`,
 *    der Wechsel als `onSelect(id)`-Callback. So weiß die Library nichts mehr
 *    über den Routing-Hook.
 *  - Tab-Labels/Icon-Keys waren als lokale `TAB_LABELS`/`TAB_ICON_PATHS`-Maps
 *    hart eingebettet → als statische Defaults (DEFAULT_LABELS) erhalten, aber
 *    pro Tab via `tab.label` / `tab.icon` überschreibbar. Icons werden über das
 *    TabIcon-Atom (Key→Pfad-Dispatch) statt inline-SVG gerendert.
 *  - Die ~8 inline-Styleblöcke der Quelle (Tab-Bar-Container,
 *    Tab-Button, Count-Badge, Mobile-Nav, Toggle-Button, Toggle-SVG) sind
 *    verlustfrei auf Tailwind-v4-Klassen + Catppuccin-Tokens gemappt
 *    (Ziel maxInline=0). Der Tab-Button + Count-Badge wandern komplett ins
 *    TabButton-Atom; der Toggle-SVG-`scaleX(-1)` wird per statischer
 *    `-scale-x-100`-Klasse abgebildet (kein runtime-dynamischer style nötig).
 *
 * Ephemerer UI-State: keiner nötig (alle Handler sind zustandslos).
 *
 * @param {object} props
 * @param {Array<{id:string,label?:string,icon?:string}>} props.tabs - Tab-Definitionen
 *        (id = stabiler Key + TabIcon-Key-Default; label/icon optional pro Tab überschreibbar)
 * @param {string} props.activeTab - id des aktiven Tabs
 * @param {(id:string)=>void} [props.onSelect] - Tab-Wechsel (gehoben aus Routing-Hook)
 * @param {Record<string,number>} [props.counts={}] - Count-Badge je Tab-id (typeof number → gerendert)
 * @param {boolean} [props.sidebarCollapsed=false] - Zustand des Sidebar-Toggles
 * @param {()=>void} [props.onToggleSidebar] - Sidebar ein-/ausklappen (nur Desktop)
 * @param {boolean} [props.mobile=false] - Mobile-Layout (fixierte Bottom-Bar, kein Toggle)
 * @param {boolean} [props.showSidebarToggle=true] - Sidebar-Toggle im Desktop-Layout zeigen
 * @param {string} [props.dataUiScope='project-home-tabs'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import TabButton from '../molecules/TabButton.jsx'
import TabIcon from '../atoms/TabIcon.jsx'

// Default-Labels (aus der Quelle übernommen). Pro Tab via tab.label überschreibbar.
const DEFAULT_LABELS = {
  overview: 'Overview',
  backlog: 'Backlog',
  roadmap: 'Roadmap',
  todo: 'ToDo',
  sstd: 'SSTD',
  memory: 'Memory',
  settings: 'Settings',
}

// Toggle-Styling: collapsed = Akzent-Tint + Akzent-Border + Akzent-Color.
const TOGGLE_STATE = {
  collapsed:
    'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] text-[var(--accent-primary)] border-[var(--accent-primary)]',
  expanded: 'bg-transparent text-[var(--subtext0)] border-[var(--surface0)]',
}

export default function ProjectHomeTabs({
  tabs = [],
  activeTab,
  onSelect,
  counts = {},
  sidebarCollapsed = false,
  onToggleSidebar,
  mobile = false,
  showSidebarToggle = true,
  dataUiScope = 'project-home-tabs',
  className = '',
}) {
  const renderTab = (tab) => {
    const id = tab.id
    const label = tab.label ?? DEFAULT_LABELS[id] ?? id
    const iconKey = tab.icon ?? id
    return (
      <TabButton
        key={id}
        active={activeTab === id}
        count={counts[id]}
        icon={<TabIcon name={iconKey} size={mobile ? 16 : 14} />}
        mobile={mobile}
        onClick={() => onSelect?.(id)}
        aria-controls={`tabpanel-${id}`}
        data-ui={`${dataUiScope}.tab.${id}`}
      >
        {label}
      </TabButton>
    )
  }

  if (mobile) {
    return (
      <nav
        role="tablist"
        aria-label="Project-Home Tabs (mobile)"
        data-ui={`${dataUiScope}.mobile`}
        className={`fixed bottom-0 left-0 right-0 z-30 flex pb-safe-bar bg-[var(--mantle)] border-t border-t-[var(--surface0)] ${className}`}
      >
        {tabs.map(renderTab)}
      </nav>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="Project-Home Tabs"
      data-ui={dataUiScope}
      className={`flex items-stretch gap-1 h-[46px] px-5 overflow-x-auto bg-[var(--mantle)] border-b border-b-[var(--surface0)] ${className}`}
    >
      {tabs.map(renderTab)}
      <div className="flex-1" aria-hidden="true" />
      {showSidebarToggle && (
        <button
          type="button"
          data-ui={`${dataUiScope}.sidebar-toggle`}
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Sidebar einblenden' : 'Sidebar einklappen'}
          aria-pressed={sidebarCollapsed}
          title={sidebarCollapsed ? 'Sidebar einblenden (48 → 340px)' : 'Sidebar einklappen (340 → 48px)'}
          className={`self-center grid place-items-center w-[30px] h-[30px] rounded-md border cursor-pointer transition-colors ${
            sidebarCollapsed ? TOGGLE_STATE.collapsed : TOGGLE_STATE.expanded
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`transition-transform ${sidebarCollapsed ? '-scale-x-100' : ''}`}
          >
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
