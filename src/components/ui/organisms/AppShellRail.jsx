/**
 * AppShellRail — Organism (05.80 AppShell). Icon-Navigations-Rail (links).
 * Präsentational, props-driven. data-ui="app-shell.rail". Trägt role="navigation"
 * statt Struktur-Tag (GF-321-Guard).
 *
 * Komponiert das NavItem-Molekül als interaktiven Nav-Row-Primitiv (tier-konform,
 * devd-tiers/no-raw-primitive) + lucide-Icons. Aktiver Akzent als Wrapper-Linksrule
 * (zuverlässig, kein className-Override gleicher Spezifität — B03/NavItem-Lektion).
 *
 * KANONISCHE 2 States (PO 2026-06-24, Contract): `collapsed` treibt das Layout
 * (kein draftVersion mehr — die 3 Explorationen sind kollabiert):
 *   collapsed=false (Default) · marker-Rail (breit) — `[short]`-Shortcut + `▸`-Marker am
 *     aktiven Item + Icon + Label. (war Draft3, PO-Kanon)
 *   collapsed=true · icon-only-Rail (schmal) — reine Glyph-Rail, Label nur als aria. (war Draft1)
 * Toggle (unten-rechts) schaltet zwischen beiden (app-shell.rail.toggle).
 *
 * Navigation = Callback (IconSidebar-Präzedenz): item.onClick / item.active kommen vom
 * Container (AppShellFrame, R6) — die Rail managt KEINE Route.
 *
 * @param {object} props
 * @param {Array<{key:string, Cmp:import('react').ComponentType, label:string, short?:string, onClick?:()=>void, active?:boolean}>} [props.items]
 * @param {string} [props.activeKey] - aktives Item (Fallback, wenn item.active fehlt).
 * @param {boolean} [props.collapsed=false] - icon-only (true) ↔ marker-Rail (false).
 * @param {()=>void} [props.onToggleCollapsed]
 * @param {()=>void} [props.onSettings] - gepinntes Settings-Item.
 * @param {string} [props.className]
 */
import { Network, Home, ClipboardCheck, ListTodo, Brain, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import NavItem from '../molecules/NavItem.jsx'
import IconButton from '../atoms/IconButton.jsx'

// Story-Default-NAV (short = Tastatur-Shortcut, PO 2026-06-20). Im echten Frame kommen
// die Items aus navItems.js + Icon-Map (AppShellFrame), nicht von hier.
const NAV = [
  { key: 'projects', Cmp: Network, label: 'Projekte', short: 'p' },
  { key: 'home', Cmp: Home, label: 'Project Home', short: 'h' },
  { key: 'review', Cmp: ClipboardCheck, label: 'Review', short: 'r' },
  { key: 'backlog', Cmp: ListTodo, label: 'Backlog', short: 'b' },
  { key: 'memories', Cmp: Brain, label: 'Memories', short: 'm' },
]

// Aktiver Akzent als Wrapper-Linksrule (eigenes Element → zuverlässig).
function railRow(active, node) {
  return (
    <div className={`rounded-[var(--radius-sm)] border-l-2 ${active ? 'border-[var(--accent-primary)]' : 'border-transparent'}`}>
      {node}
    </div>
  )
}

export default function AppShellRail({
  items = NAV,
  activeKey = 'backlog',
  collapsed = false,
  onToggleCollapsed,
  onSettings,
  className = '',
  ...rest
}) {
  function renderItem({ key, Cmp, label, short, onClick, active }) {
    const isActive = active ?? key === activeKey
    if (collapsed) {
      return (
        <div key={key}>
          {railRow(
            isActive,
            <NavItem
              data-ui={`app-shell.rail.item.${key}`}
              iconOnly
              active={isActive}
              onClick={onClick}
              icon={<Cmp size={18} />}
              label={label}
            />,
          )}
        </div>
      )
    }
    return (
      <div key={key}>
        {railRow(
          isActive,
          <NavItem
            data-ui={`app-shell.rail.item.${key}`}
            active={isActive}
            onClick={onClick}
            icon={
              <span className="flex items-center gap-2">
                {short ? <span className="text-xs tabular-nums text-[var(--overlay0)]">{`[${short}]`}</span> : null}
                <span className={`w-2 text-[var(--accent-primary)] ${isActive ? '' : 'opacity-0'}`} aria-hidden="true">▸</span>
                <Cmp size={16} />
              </span>
            }
          >
            {label}
          </NavItem>,
        )}
      </div>
    )
  }

  const settingsRow = collapsed ? (
    <NavItem data-ui="app-shell.rail.settings" iconOnly active={false} onClick={onSettings} icon={<Settings size={18} />} label="Einstellungen" />
  ) : (
    <NavItem data-ui="app-shell.rail.settings" active={false} onClick={onSettings} icon={<Settings size={16} />}>Einstellungen</NavItem>
  )

  return (
    <div
      role="navigation"
      aria-label="Hauptnavigation"
      data-ui="app-shell.rail"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`flex shrink-0 flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--mantle)] p-2 [font-family:var(--font-display)] ${collapsed ? 'w-[3.25rem] items-center' : 'w-52'} ${className}`}
      {...rest}
    >
      {items.map(renderItem)}
      <div className="flex-1" />
      {settingsRow}
      {/* Collapse/Expand-Toggle — in der Rail unten, rechtsbündig (PO 2026-06-24). */}
      <div className="flex justify-end pt-1">
        <IconButton
          data-ui="app-shell.rail.toggle"
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          label={collapsed ? 'Rail aufklappen' : 'Rail einklappen'}
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
        />
      </div>
    </div>
  )
}
