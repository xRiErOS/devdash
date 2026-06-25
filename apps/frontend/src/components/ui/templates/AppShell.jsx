/**
 * AppShell — kanonisches, token-sauberes Template (DD-481 Phase 4).
 *
 * Extraktion der SOLL-App-Shell aus dem Anker `Screens/App-Shell`
 * (src/components/screens/AppShell.stories.jsx, Slice 1a, Excalidraw-Entwurf 2).
 * Der Anker ist der autoritative visuelle Vertrag; dieses Template zieht NUR
 * dessen Frame (3 Zonen) heraus und macht die Inhalte zu Slots, damit der Anker
 * und die echten Screens es in Phase 5 adoptieren (Slice 1b). Bewusst NICHT aus
 * dem Legacy-`components/ui/layout/Layout.jsx` geharvestet — der Anker lehnt das Live-Layout
 * explizit ab.
 *
 * Frame (oben → unten), data-ui-Vokabular 1:1 wie der Anker:
 *  - `${scope}.root`     → h-full flex-col-Gerüst
 *  - `${scope}.topbar`   → Card(mantle) Top-Leiste; Inhalt via `topbar`-Slot
 *                          (Quick-Switcher + Breadcrumb | Search + Shortcuts + Theme).
 *  - `${scope}.rail`     → Card(mantle) schmale Icon-Rail; Inhalt via `rail`-Slot
 *                          (Nav-Icons + Spacer + globale Icons). Breite via `railWidth`.
 *  - `${scope}.content`  → Card(base, scrollbar) Haupt-Outlet; `children`.
 *
 * PRESENTATIONAL: kein Router/Store/fetch. Alle Bereiche sind Slot-Props
 * (ReactNode); fehlt ein Slot, entfällt die Zone (topbar) bzw. die Rail-Spalte
 * (rail → content rendert dann vollbreit). Kein ephemerer State nötig.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.topbar]   - Inhalt der Top-Leiste (Slot)
 * @param {React.ReactNode} [props.rail]      - Inhalt der Icon-Rail (Slot)
 * @param {React.ReactNode} [props.children]  - Haupt-Inhalt (Content-Outlet)
 * @param {string} [props.railWidth='3.25rem'] - Rail-Breite (rem, kein px)
 * @param {string} [props.dataUiScope='app-shell'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className]
 */

import Card from '../atoms/Card.jsx'
import Sidebar from '../layout/Sidebar.jsx'

export default function AppShell({
  topbar,
  rail,
  children,
  railWidth = '3.25rem',
  dataUiScope = 'app-shell',
  className = '',
}) {
  const content = (
    <Card
      tone="base"
      className="h-full overflow-auto"
      data-ui={`${dataUiScope}.content`}
    >
      {children}
    </Card>
  )

  const body =
    rail != null ? (
      <Sidebar
        side={
          <Card
            tone="mantle"
            padding="sm"
            className="h-full"
            data-ui={`${dataUiScope}.rail`}
          >
            {rail}
          </Card>
        }
        sideWidth={railWidth}
        gap="sm"
        className="h-full flex-nowrap"
      >
        {content}
      </Sidebar>
    ) : (
      content
    )

  return (
    <div
      data-ui={`${dataUiScope}.root`}
      className={`h-full flex flex-col gap-2 font-sans ${className}`}
    >
      {topbar != null && (
        <Card tone="mantle" padding="sm" data-ui={`${dataUiScope}.topbar`}>
          {topbar}
        </Card>
      )}
      <div className="flex-1 min-h-0">{body}</div>
    </div>
  )
}
