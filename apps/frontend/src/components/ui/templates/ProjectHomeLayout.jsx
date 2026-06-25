/**
 * ProjectHomeLayout — kanonische, token-saubere 3-Spalten-Layout-Shell mit
 * Sidebar-Collapse-Mechanik + spannendem Bottom-Slot (DD-481 Phase 4 Templates,
 * Harvest aus src/components/projectHome/ProjectHomeLayout.jsx, INV-112).
 *
 * TIER = TEMPLATE: trotz des Namens „ProjectHome" trägt diese Hülle KEIN
 * Domänen-Wissen (Inventory bestätigt INV-112). Sie kennt weder Projekt, Sprint,
 * Issue noch Tab-Routing — sie liefert nur das responsive Grid-Gerüst:
 *   Breadcrumb → PageHeading → TabBar → (Main + optionale Sidebar) → Bottom-Slot,
 * plus eine Mobile-Variante (Bottom-Tab-Bar statt Sidebar). Alle Inhalte kommen
 * ausschließlich über Slot-Props (ReactNode) herein.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch, kein Datenladen, kein Store/
 * projectStore, keine API, kein Routing. Die Quelle war bereits präsentational —
 * gehobene/erhaltene Kopplung beim Harvest:
 *  - `useViewportMode` (Resize-Listener) ist EPHEMERER UI-State, kein Datenladen,
 *    und BLEIBT (Mockup-Vertrag: 3 Breakpoints Mobile/Tablet/Desktop). Der
 *    `useEffect` registriert nur `window.resize`, lädt nichts.
 *  - `sidebarCollapsed` bleibt eine reine Steuer-Prop (Collapse-State lebt beim
 *    Aufrufer/Screen, nicht hier) — kein eigener State, damit die Hülle
 *    kontrolliert bleibt.
 *
 * TOKEN-CLEAN: die ~6 inline-style der Quelle (var(--base)/var(--mantle)/
 * var(--surface0)/var(--subtext0), feste px) sind in statische Tailwind-v4-
 * arbitrary-Klassen konvertiert. Genuin DYNAMISCH bleiben nur (a) die
 * Grid-Spalten (desktop × collapsed → 1fr/48px | 1fr/340px, sonst 1fr) und
 * (b) das Mobile-Bottom-Padding (Bottom-Nav-Höhe + Abstand). Diese zwei Werte
 * laufen über CSS-Custom-Properties, die per ref-callback gesetzt werden
 * (Muster ProjectsLanding DD-439: el && el.style.setProperty(...)); das Markup
 * trägt damit 0 double-brace inline-style.
 *
 * Slot-Vertrag (verbindlich):
 *  - breadcrumb  (ReactNode) → optionale Breadcrumb-Zeile (ganz oben).
 *  - pageHeading (ReactNode) → optionaler H1-Block (zwischen Breadcrumb & TabBar).
 *  - tabBar      (ReactNode) → Top-Tab-Bar (Tablet + Desktop; auf Mobile aus).
 *  - mainContent (ReactNode) → Hauptinhalt (linke/breite Spalte).
 *  - sidebar     (ReactNode) → rechte Spalte (NUR Desktop ≥1024; bei collapsed
 *                              48px Stub-Breite). Tablet/Mobile rendern 1-spaltig.
 *  - bottomSlot  (ReactNode) → spannt beide Spalten; auf Mobile ausgeblendet,
 *                              auf Tablet/Desktop als 2er-Grid.
 *  - mobileTabBar(ReactNode) → Bottom-Nav, nur auf Mobile (statt Top-TabBar).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.tabBar]
 * @param {React.ReactNode} [props.mobileTabBar]
 * @param {React.ReactNode} [props.mainContent]
 * @param {React.ReactNode} [props.sidebar]
 * @param {React.ReactNode} [props.bottomSlot]
 * @param {boolean} [props.sidebarCollapsed=false] - Desktop-Sidebar auf 48px-Stub
 * @param {React.ReactNode} [props.breadcrumb]
 * @param {React.ReactNode} [props.pageHeading]
 * @param {string} [props.contentPadding] - überschreibt das HORIZONTALE (px) + UNTERE (pb)
 *        content-grid-Padding um Main+Sidebar (Default `var(--space-5,20px)`; z.B. `'0'` für
 *        flush-to-grid L/R/unten, #13). Der OBERE Abstand zur Tab-Bar bleibt fix erhalten.
 * @param {string} [props.dataUiScope='project-home-layout'] - Wurzel-data-ui-bereich
 * @param {string} [props.className]
 */
import { useEffect, useState } from 'react'

const MOBILE_MAX = 767
const TABLET_MAX = 1023

function modeFor(width) {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

// 3 Breakpoints laut Mockup: Tablet (768-1023) = 1 Spalte, Sidebar versteckt,
// aber Top-Tab-Bar + Bottom-Slot bleiben (anders als Mobile).
function useViewportMode() {
  const [mode, setMode] = useState(() =>
    typeof window === 'undefined' ? 'desktop' : modeFor(window.innerWidth),
  )
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setMode(modeFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mode
}

export default function ProjectHomeLayout({
  tabBar,
  mobileTabBar,
  mainContent,
  sidebar,
  bottomSlot,
  sidebarCollapsed = false,
  breadcrumb,
  pageHeading,
  contentPadding,
  dataUiScope = 'project-home-layout',
  className = '',
}) {
  const mode = useViewportMode()
  const isMobile = mode === 'mobile'
  const isDesktop = mode === 'desktop'
  // Sidebar nur Desktop (≥1024). Tablet rendert 1-spaltig ohne Sidebar —
  // verhindert Overflow bei 768-1023px.
  const showSidebar = isDesktop && Boolean(sidebar)
  // Bottom-Slot nicht auf Mobile; auf Tablet + Desktop sichtbar.
  const renderBottomSlot = !isMobile && Boolean(bottomSlot)

  const contentGridCols = showSidebar
    ? sidebarCollapsed
      ? 'minmax(0, 1fr) 48px'
      : 'minmax(0, 1fr) 340px'
    : '1fr'

  // Dynamische Werte als CSS-Custom-Properties via ref-callback (DD-439-Muster):
  // Grid-Spalten + Mobile-Bottom-Padding. Hält das Markup auf 0 double-brace.
  const pad = contentPadding ?? 'var(--space-5, 20px)'
  const setGridVars = (el) => {
    if (!el) return
    el.style.setProperty('--phl-grid-cols', contentGridCols)
    el.style.setProperty('--phl-content-pad', pad)
    el.style.setProperty(
      '--phl-pad-bottom',
      isMobile
        ? 'calc(var(--mobile-bottom-nav-h, 56px) + 24px)'
        : pad,
    )
  }

  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col min-h-full bg-[var(--base)] ${className}`}
    >
      {breadcrumb && (
        <div
          data-ui={`${dataUiScope}.breadcrumb`}
          className="px-4 py-2 text-[13px] border-b border-[var(--surface0)] bg-[var(--mantle)] text-[var(--subtext0)]"
        >
          {breadcrumb}
        </div>
      )}

      {/* Reihenfolge verbindlich: Breadcrumb → H1 → TabBar → Main. */}
      {pageHeading && (
        <div
          data-ui={`${dataUiScope}.page-heading`}
          className="px-4 pt-3 bg-[var(--base)]"
        >
          {pageHeading}
        </div>
      )}

      {!isMobile && tabBar}

      <div
        ref={setGridVars}
        data-ui={`${dataUiScope}.content-grid`}
        className="flex-1 grid min-h-0 pt-[var(--space-5,20px)] px-[var(--phl-content-pad,var(--space-5,20px))] pb-[var(--phl-pad-bottom)] gap-[var(--space-5,20px)] [grid-template-columns:var(--phl-grid-cols)] [grid-template-rows:1fr_auto] [transition:grid-template-columns_0.2s_ease]"
      >
        <main
          data-ui={`${dataUiScope}.main-content`}
          className="min-w-0 min-h-0"
        >
          {mainContent}
        </main>
        {showSidebar && sidebar}
        {renderBottomSlot && (
          <div
            data-ui={`${dataUiScope}.bottom-slot`}
            className="[grid-column:1/-1] grid grid-cols-2 gap-[var(--space-4,16px)]"
          >
            {bottomSlot}
          </div>
        )}
      </div>

      {isMobile && mobileTabBar}
    </div>
  )
}
