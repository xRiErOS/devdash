// DD-282 R4 (M3-S02 T02): Tab-Bar 1:1 aus DD39-Mockup-v2 (.tab-bar Z.176-209).
// - height 46, padding 0 var(--space-5), gap var(--space-1), mantle-bg, border-bottom surface0
// - .tab: Mono, 13px/500, subtext0, border-top+bottom 2px transparent (Baseline stabil),
//   Icon 14px + Label + optional .count-Badge
// - .tab.active: color text + border-bottom peach (KEIN Background!)
// - .count: surface0/subtext0 Pill; active → peach/on-accent
// - Collapse-Toggle: collapsed = peach-12%-tint + peach-border + peach-color + svg scaleX(-1)
// Icon-Pfade verbatim aus dem Mockup (viewBox 0 0 24 24, stroke currentColor).

import { TAB_IDS } from '../../hooks/useProjectHomeTab.js'

// DD-487 (T02): SOLL-Tab-Set — Todo + Settings entfernt, Memories aufgenommen.
const TAB_LABELS = {
  overview: 'Overview',
  backlog: 'Backlog',
  roadmap: 'Roadmap',
  sstd: 'SSTD',
  memory: 'Memories',
}

// Verbatim-Pfade aus dem Mockup (DD39-project-home-mockup-v2.html, .tab svg).
const TAB_ICON_PATHS = {
  overview: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  backlog: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
  roadmap: <><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /></>,
  sstd: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  // memory: Lucide `database` (gestapelte Zylinder = Memory-Store).
  memory: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></>,
}

function TabIcon({ id, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {TAB_ICON_PATHS[id]}
    </svg>
  )
}

function TabButton({ id, active, onClick, count, mobile }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`tabpanel-${id}`}
      data-ui={`project-home.tabs.${id}`}
      onClick={() => onClick(id)}
      style={{
        background: 'transparent',
        color: active ? 'var(--text)' : 'var(--subtext0)',
        border: 0,
        borderTop: '2px solid transparent',
        borderBottom: active && !mobile ? '2px solid var(--peach)' : '2px solid transparent',
        padding: mobile ? '6px 6px' : '0 var(--space-4, 16px)',
        fontFamily: 'var(--font-display, system-ui)',
        fontSize: mobile ? 11 : 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        minHeight: mobile ? 44 : 0,
        minWidth: mobile ? 44 : 0,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: mobile ? 2 : 8,
        flex: mobile ? 1 : 'initial',
      }}
    >
      <TabIcon id={id} size={mobile ? 16 : 14} />
      {TAB_LABELS[id]}
      {typeof count === 'number' && (
        <span
          style={{
            background: active ? 'var(--peach)' : 'var(--surface0)',
            color: active ? 'var(--on-accent)' : 'var(--subtext0)',
            padding: '1px 6px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-display, system-ui)',
            lineHeight: 1.4,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export default function ProjectHomeTabs({ activeTab, onSelect, onToggleSidebar, sidebarCollapsed, counts = {}, mobile = false }) {
  if (mobile) {
    return (
      <nav
        role="tablist"
        aria-label="Project-Home Tabs (mobile)"
        data-ui="project-home.tabs.mobile"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          background: 'var(--mantle)',
          borderTop: '1px solid var(--surface0)',
          zIndex: 30,
        }}
      >
        {TAB_IDS.map((id) => (
          <TabButton key={id} id={id} active={activeTab === id} onClick={onSelect} count={counts[id]} mobile />
        ))}
      </nav>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="Project-Home Tabs"
      data-ui="project-home.tabs"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 'var(--space-1, 4px)',
        height: 46,
        borderBottom: '1px solid var(--surface0)',
        background: 'var(--mantle)',
        padding: '0 var(--space-5, 20px)',
        overflowX: 'auto',
      }}
    >
      {TAB_IDS.map((id) => (
        <TabButton key={id} id={id} active={activeTab === id} onClick={onSelect} count={counts[id]} />
      ))}
      <div style={{ flex: 1 }} aria-hidden="true" />
      <button
        type="button"
        data-ui="project-home.sidebar.head.toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Sidebar einblenden' : 'Sidebar einklappen'}
        aria-pressed={sidebarCollapsed}
        title={sidebarCollapsed ? 'Sidebar einblenden (48 → 340px)' : 'Sidebar einklappen (340 → 48px)'}
        style={{
          alignSelf: 'center',
          background: sidebarCollapsed ? 'color-mix(in srgb, var(--peach) 12%, transparent)' : 'transparent',
          color: sidebarCollapsed ? 'var(--peach)' : 'var(--subtext0)',
          border: `1px solid ${sidebarCollapsed ? 'var(--peach)' : 'var(--surface0)'}`,
          width: 30,
          height: 30,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
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
          style={{ transform: sidebarCollapsed ? 'scaleX(-1)' : 'none' }}
        >
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>
    </div>
  )
}
