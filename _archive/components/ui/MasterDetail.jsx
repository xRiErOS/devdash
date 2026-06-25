import Sidebar from './layout/Sidebar.jsx'

/**
 * MasterDetail — Archetyp-Organismus (DD-424, Frontend-Rework P7.5).
 *
 * Vorschreibendes Page-Layout für „Liste/Meta links · Detail-Pane rechts".
 * Recompose-Ziel ab Plan 08: ItemDetail/Memory rasten in die Slots ein statt
 * das Master-Detail-Gerüst je View nachzubauen. Trägt KEINE View-Logik — nur
 * das Slot-Skelett. Styling ausschließlich über Catppuccin-Tokens als
 * Tailwind-Arbitrary-Value-Klassen (ZERO inline style, kein Roh-Hex/px).
 *
 * Slot-Vertrag (verbindlich):
 *  - sidebar (ReactNode)      → schmale linke Spalte. Zwei Ausprägungen über
 *                               `sidebarVariant`: 'list' (scrollbare Item-Liste
 *                               mit Suche/Filter) ODER 'meta' (Eigenschaften-
 *                               Felder, MetaPill-Inline-Edit). BEIDE laufen über
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
 *        'list'-Variante (z.B. Memory-Liste, DD-444) braucht mehr Breite und
 *        reicht hier ein vereinheitlichtes Token durch.
 * @param {React.ReactNode} [props.paneHeader] - Header über den Tabs
 * @param {React.ReactNode} [props.pane] - Tab-Leiste + Tab-Inhalt (Hauptbereich)
 * @param {React.ReactNode} [props.actionBar] - Fuß-Aktionsleiste
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container
 * @param {string} [props.dataUi] - optionales data-ui (nicht hardcoden, durchreichen)
 */
export default function MasterDetail({
  sidebar,
  sidebarVariant = 'list',
  sideWidth,
  paneHeader,
  pane,
  actionBar,
  className = '',
  dataUi,
}) {
  const sidebarSlot = (
    <div
      data-md-sidebar-variant={sidebarVariant}
      className="flex flex-col h-full overflow-y-auto bg-[var(--mantle)] border border-[var(--surface0)] rounded-md"
    >
      {sidebar}
    </div>
  )

  const detailPane = (
    <div className="flex flex-col h-full min-h-0 bg-[var(--base)]">
      {paneHeader && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--mantle)] border-b border-[var(--surface0)] shrink-0">
          {paneHeader}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">{pane}</div>
      {actionBar && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--mantle)] border-t border-[var(--surface0)] shrink-0">
          {actionBar}
        </div>
      )}
    </div>
  )

  return (
    <div
      data-ui={dataUi}
      className={`flex flex-col h-full min-h-0 text-[var(--text)] ${className}`}
    >
      <Sidebar side={sidebarSlot} sideWidth={sideWidth} gap="md">
        {detailPane}
      </Sidebar>
    </div>
  )
}
