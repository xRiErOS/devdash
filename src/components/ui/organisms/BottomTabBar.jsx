/**
 * BottomTabBar — Shell-Primärnavigation als fixierte Bottom-Tab-Bar (mobile).
 *
 * Cutover der SOLL-Story-Komponente (AppShell.stories.jsx BottomTabBar, F1
 * DD-633 / FSD T01) in ein echtes Organism. Hebt das ProjectHomeTabs-mobile-
 * Muster (DD-481) auf Shell-Ebene: 5 Primärnav-Ziele in der Daumen-Zone,
 * jeder Tab ≥44px (TabButton mobile). Löst den Floating-Drawer (IconSidebar
 * Mobile, DD-534) ab.
 *
 * PRESENTATIONAL: kein react-router, kein Store, kein fetch. Navigation kommt
 * als `items=[]`-Prop ({ key, label, icon, command? }); Klick ruft
 * `onNavigate(key)` — der Konsument mappt key→route und navigiert selbst.
 * Der ⌘K-/Command-Tag (`command: true`) zeigt das Lucide-Command-Icon.
 *
 * F5 (DD-637): die Bar respektiert `env(safe-area-inset-bottom)` via `pb-safe-bar`
 * — kein Tab kollidiert mit der iOS-Home-Indicator-Zone. Sichtbar `<lg`; ab `lg`
 * übernimmt die angedockte IconSidebar/Nav-Rail.
 *
 * @param {object} props
 * @param {Array<{key:string,label:string,icon?:string,command?:boolean}>} [props.items] - Nav-Ziele (Reihenfolge = Render-Reihenfolge)
 * @param {string} [props.activeKey] - key des aktiven Ziels (Highlight)
 * @param {(key:string)=>void} [props.onNavigate] - Klick/Tap auf ein Ziel
 * @param {string} [props.dataUiScope='app-shell.bottom-tab'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { Command } from 'lucide-react'
import TabButton from '../molecules/TabButton.jsx'
import TabIcon from '../atoms/TabIcon.jsx'

export default function BottomTabBar({
  items = [],
  activeKey,
  onNavigate,
  dataUiScope = 'app-shell.bottom-tab',
  className = '',
}) {
  return (
    <nav
      role="tablist"
      aria-label="App-Shell Primärnavigation (mobile)"
      data-ui={`${dataUiScope}.nav`}
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 flex pb-safe-bar bg-[var(--mantle)] border-t border-t-[var(--surface0)] ${className}`}
    >
      {items.map((item) => (
        <TabButton
          key={item.key}
          mobile
          active={item.key === activeKey}
          icon={item.command ? <Command size={16} strokeWidth={2} /> : <TabIcon name={item.icon} size={16} />}
          onClick={() => onNavigate?.(item.key)}
          aria-controls={`tabpanel-${item.key}`}
          data-ui={`${dataUiScope}.tab.${item.key}`}
        >
          {item.label}
        </TabButton>
      ))}
    </nav>
  )
}
