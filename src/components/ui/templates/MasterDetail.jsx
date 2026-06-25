import Sidebar from '../layout/Sidebar.jsx'

/**
 * MasterDetail — Template-Tier Layout-Gerüst (DD-481 Phase 4, Harvest INV-109).
 *
 * Vorschreibendes Page-Layout für „Liste/Meta links · Detail-Pane rechts".
 * Reine Slot-Shell, KEINE Domäne/View-Logik. Views rasten ihre Inhalte in die
 * Slots ein statt das Master-Detail-Gerüst je View nachzubauen. Styling
 * ausschließlich über Catppuccin-Tokens als Tailwind-Arbitrary-Value-Klassen
 * (ZERO inline style, kein Roh-Hex/px).
 *
 * Wiederverwendung: Layout-Primitive `../layout/Sidebar` (fixe Spalte neben
 * flexiblem Inhalt). Trägt KEINE Domänen-Kopplung — alle Inhalte kommen als
 * Slot-Props rein.
 *
 * Slot-Vertrag (verbindlich):
 *  - sidebar (ReactNode)      → schmale linke Spalte. Zwei Ausprägungen über
 *                               `sidebarVariant`: 'list' (scrollbare Item-Liste
 *                               mit Suche/Filter) ODER 'meta' (Eigenschaften-
 *                               Felder, Inline-Edit). BEIDE laufen über
 *                               dieselbe Sidebar-Primitive (layout/Sidebar).
 *  - paneHeader (ReactNode)   → Titel · Status · Pane-Aktionen, oberhalb der Tabs.
 *  - pane (ReactNode)         → Haupt-Detailinhalt (Tab-Leiste + Tab-Body).
 *  - actionBar (ReactNode)    → Speichern/Abbrechen/Löschen, fußzeilen-fixiert.
 *
 * @param {object} props
 * @param {React.ReactNode} props.sidebar - linke Spalte (Liste oder Meta)
 * @param {'list'|'meta'} [props.sidebarVariant='list'] - Sidebar-Ausprägung
 * @param {string} [props.sideWidth] - Breite der Sidebar-Spalte (rem/%-Token).
 *        Default = Sidebar-Primitive-Default (13.75rem, passt für 'meta'). Die
 *        'list'-Variante braucht mehr Breite und reicht hier ein
 *        vereinheitlichtes Token durch.
 * @param {React.ReactNode} [props.paneHeader] - Header über den Tabs
 * @param {React.ReactNode} [props.pane] - Tab-Leiste + Tab-Inhalt (Hauptbereich)
 * @param {React.ReactNode} [props.actionBar] - Fuß-Aktionsleiste
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container
 * @param {string} [props.dataUiScope='master-detail'] - data-ui-Wurzel; Sub-Anker
 *        werden gepunktet abgeleitet (z.B. `${dataUiScope}.pane`).
 */
// Canon-Farbleiter (01.15): base=Content-Canvas (Default), mantle=Chrome, surface0=Card.
// Eine Master-Detail-Sidebar ist CONTENT (keine Nav-Chrome) und steht — wie der Detail-Pane —
// auf `base`; die Listen-ITEMS darin sind die Cards (surface0). Default daher `base` (PO Color-
// Hierarchy-Review, 01.15 „Applied"). Bevorzugt theme-aware Ebenen-Aliase (`layer-1..4`, Canon
// R14); rohe Token-Keys bleiben für Bestands-Consumer (z.B. ReviewFlow layer-2) erhalten.
const SIDEBAR_SURFACE = {
  transparent: 'bg-transparent',
  'layer-1': 'bg-[var(--layer-1)]',
  'layer-2': 'bg-[var(--layer-2)]',
  'layer-3': 'bg-[var(--layer-3)]',
  'layer-4': 'bg-[var(--layer-4)]',
  mantle: 'bg-[var(--mantle)]',
  base: 'bg-[var(--base)]',
  surface0: 'bg-[var(--surface0)]',
}

export default function MasterDetail({
  sidebar,
  sidebarVariant = 'list',
  sideWidth,
  sidebarSurface = 'base',
  paneSurface = 'base',
  paneHeader,
  pane,
  actionBar,
  className = '',
  dataUiScope = 'master-detail',
}) {
  // DD-Review (T06, D02 template-global): Höhen-/Scroll-Modell ist responsiv.
  // ≥lg: zweispaltig, jede Spalte `h-full` mit eigenem `overflow-y-auto` (Liste
  // scrollt intern, Pane steht). <lg: Spalten stapeln (Sidebar flex-wrap) — dann
  // KEINE feste `h-full`/innere Scroll-Box, sonst quillt der gestapelte Detail-
  // Pane aus der `overflow:visible`-Box, ohne dass die natürliche Höhe nach oben
  // propagiert → der Seiten-Scroller (app-shell.content) sieht kein Overflow und
  // der Pane ist unerreichbar. Natürliche Höhe <lg → die Seite scrollt und der
  // Detail-Pane kommt in Sicht. Gilt für ALLE MasterDetail-Konsumenten.
  const sidebarSlot = (
    <div
      data-ui={`${dataUiScope}.sidebar`}
      data-md-sidebar-variant={sidebarVariant}
      className={`flex flex-col lg:h-full lg:overflow-y-auto ${SIDEBAR_SURFACE[sidebarSurface] || SIDEBAR_SURFACE.mantle} border border-[var(--surface0)] rounded-md`}
    >
      {sidebar}
    </div>
  )

  const detailPane = (
    <div
      data-ui={`${dataUiScope}.pane`}
      className={`flex flex-col lg:h-full min-h-0 ${SIDEBAR_SURFACE[paneSurface] || 'bg-[var(--base)]'}`}
    >
      {paneHeader && (
        <div
          data-ui={`${dataUiScope}.pane-header`}
          className="flex items-center gap-2 px-4 py-3 bg-[var(--mantle)] border-b border-[var(--surface0)] shrink-0"
        >
          {paneHeader}
        </div>
      )}
      <div className="flex-1 min-h-0 lg:overflow-y-auto">{pane}</div>
      {actionBar && (
        <div
          data-ui={`${dataUiScope}.action-bar`}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--mantle)] border-t border-[var(--surface0)] shrink-0"
        >
          {actionBar}
        </div>
      )}
    </div>
  )

  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col lg:h-full lg:min-h-0 text-[var(--text)] ${className}`}
    >
      <Sidebar side={sidebarSlot} sideWidth={sideWidth} gap="md">
        {detailPane}
      </Sidebar>
    </div>
  )
}
