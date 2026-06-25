import { Columns3 } from 'lucide-react'

/**
 * BoardPage — kanonisches, token-sauberes Organism (DD-481 Phase 3 Batch 5,
 * Harvest aus src/components/ui/BoardPage.jsx, DD-425 Archetyp-Organismus).
 *
 * Generisches, horizontal scrollbares Spalten-/Swimlane-Gerüst, in das ab
 * Plan 08 Board-Views nur noch einrasten (Slot-Befüllung statt Eigenbau). Bewusst
 * NUR das generische Gerüst: die volle 3-Modi-Roadmap-Konsolidierung
 * (Sprint-Board / Meilenstein-Swimlane / Timeline) ist eine eigene Plan-Session
 * (DD-455), NICHT hier. DnD-fähig vorbereitet — alle Slots akzeptieren beliebige
 * Kinder; es wird KEINE dnd-kit-Verdrahtung erzwungen.
 *
 * TIER-EINSCHÄTZUNG (TIER-RECHECK, ehrlich) → tierFlag = SHOULD_BE_TEMPLATE.
 * BoardPage kennt KEINE Domäne: es weiß nichts von Sprint, Issue, Milestone oder
 * Status. Es ist ein reines, domänen-agnostisches Layout-Gerüst aus generischen
 * Layout-Slots (toolbar / lanes / column / card / backfill). Der einzige
 * „Inhalt" (das Fallback-Lane-Gerüst mit Columns3-Icon + „Lane"-Label) ist
 * Platzhalter-Optik, keine Domänen-Logik. Damit gehört es seiner Natur nach in
 * den Template-Tier (Page-Level-Layout-Shell), nicht in den Organism-Tier. Es
 * wird gemäß Workflow-Vorgabe trotzdem im organisms/-Namespace gebaut und hier
 * geflaggt, statt falsch zu klassifizieren.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/projectStore/API/useEffect-
 * Datenladen. Gehobene Kopplung gegenüber der Quelle: KEINE — die Quelle
 * (src/components/ui/BoardPage.jsx) war bereits vollständig presentational
 * (reine Slot-Props, kein State, keine Daten-Kopplung). Verfeinerung beim
 * Harvest:
 *  - Das Pass-Through-Prop `dataUi` wurde gemäß I03/D01 zum parametrisierten
 *    `dataUiScope` mit Default `'board-page'` gehoben (Wurzel-data-ui immer
 *    gesetzt, Sub-Anker gepunktet abgeleitet). Damit kann ein Screen in Phase 5
 *    via dataUiScope='roadmap' den ganzen Namespace umbiegen.
 *  - Markup verlustfrei übernommen (gleiche DOM-Struktur, gleiche Klassen).
 *
 * Ephemerer UI-State: keiner nötig (reines Slot-Rendering).
 *
 * Slot-Vertrag (verbindlich):
 *  - toolbar  (ReactNode)  → Modus-Switch + Filter, oberhalb des Boards.
 *  - lanes    (ReactNode)  → die Spalten-/Swimlane-Reihe (horizontal scrollbar).
 *                            Fallback-Slots column/card/backfill rendern ein
 *                            minimales Default-Gerüst, falls kein lanes gesetzt.
 *  - column   (ReactNode)  → Spalten-Header (nur Fallback-Pfad, wenn !lanes).
 *  - card     (ReactNode)  → Karten-Inhalt einer Spalte (nur Fallback-Pfad).
 *  - backfill (ReactNode)  → Platzhalter am Spaltenende (Drop-Target-Andeutung).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.toolbar]   - Modus-Switch + Filter-Slot
 * @param {React.ReactNode} [props.lanes]     - vollständige Lane-Reihe (bevorzugt)
 * @param {React.ReactNode} [props.column]    - Einzelspalte (Fallback ohne lanes)
 * @param {React.ReactNode} [props.card]      - Kartenkörper (Fallback ohne lanes)
 * @param {React.ReactNode} [props.backfill]  - Drop-/Leer-Platzhalter (Fallback)
 * @param {string} [props.dataUiScope='board-page'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {boolean} [props.snapColumns=false] - DD-639 (F7): opt-in horizontaler Scroll-Snap der Lanes (greift nur <768px, s. index.css .snap-scroll-x). Default aus → kein Desktop-Regress für andere Board-Consumer.
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children]  - lanes-Fallback (Back-Compat)
 */
export default function BoardPage({
  toolbar,
  lanes,
  column,
  card,
  backfill,
  dataUiScope = 'board-page',
  snapColumns = false,
  className = '',
  children,
}) {
  const laneContent = lanes ?? children

  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col h-full overflow-hidden bg-[var(--base)] ${className}`}
    >
      {toolbar && (
        <div
          data-ui={`${dataUiScope}.toolbar`}
          className="flex items-center gap-3 px-5 py-2 bg-[var(--mantle)] border-b border-[var(--surface0)] shrink-0"
        >
          {toolbar}
        </div>
      )}

      <div className={`flex-1 overflow-x-auto overflow-y-auto px-5 py-4${snapColumns ? ' snap-scroll-x' : ''}`}>
        <div
          data-ui={`${dataUiScope}.lanes`}
          className="flex gap-4 h-full min-w-max"
        >
          {laneContent ?? (
            <div
              data-ui={`${dataUiScope}.column`}
              className="flex flex-col w-60 shrink-0"
            >
              {column ?? (
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--surface0)] border border-[var(--surface1)] border-b-0 rounded-t-md">
                  <span className="text-[11px] font-semibold font-mono text-[var(--text)] inline-flex items-center gap-1.5">
                    <Columns3 size={13} aria-hidden="true" className="text-[var(--subtext0)]" />
                    Lane
                  </span>
                </div>
              )}
              <div className="flex-1 flex flex-col gap-1.5 p-1.5 bg-[var(--mantle)] border border-[var(--surface1)] rounded-b-md min-h-[20rem]">
                {card && (
                  <div
                    data-ui={`${dataUiScope}.card`}
                    className="rounded bg-[var(--base)] border border-[var(--surface0)] px-2.5 py-2 text-xs text-[var(--text)]"
                  >
                    {card}
                  </div>
                )}
                <div
                  data-ui={`${dataUiScope}.backfill`}
                  className="flex-1 flex items-center justify-center rounded border border-dashed border-[var(--surface1)] text-[11px] text-[var(--hint)] min-h-16"
                >
                  {backfill}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
