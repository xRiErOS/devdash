import { Columns3 } from 'lucide-react'

/**
 * BoardPage — Archetyp-Organismus (DD-425). Generisches, horizontal
 * scrollbares Spalten-/Swimlane-Gerüst, in das ab Plan 08 Board-Views nur noch
 * einrasten (Slot-Befüllung statt Eigenbau). Bewusst NUR das generische Gerüst:
 * die volle 3-Modi-Roadmap-Konsolidierung (Sprint-Board / Meilenstein-Swimlane /
 * Timeline) ist T01 (eigene Plan-Session, DD-455), NICHT hier.
 *
 * DnD-fähig vorbereitet: alle Slots akzeptieren beliebige Kinder; es wird KEINE
 * dnd-kit-Verdrahtung erzwungen — nur die generische Spalten-Struktur. Tokens
 * AUSSCHLIESSLICH über Tailwind-Arbitrary-Value-Klassen (className-[var(--..)]),
 * niemals das inline-Style-Prop (forbid-dom-props + inline-style-budget cap=0)
 * und niemals Roh-Hex/Roh-px.
 *
 * Slot-Vertrag (verbindlich):
 *  - toolbar  (ReactNode)  → Modus-Switch + Filter, oberhalb des Boards.
 *  - lanes    (ReactNode)  → die Spalten-/Swimlane-Reihe (horizontal scrollbar).
 *                            Fallback-Slots column/card/backfill rendern ein
 *                            minimales Default-Gerüst, falls kein lanes gesetzt.
 *  - column   (ReactNode)  → Spalten-Header (nur Fallback-Pfad, wenn !lanes;
 *                            ersetzt den Default-Header der Demo-Spalte).
 *  - card     (ReactNode)  → Karten-Inhalt einer Spalte (nur Fallback-Pfad).
 *  - backfill (ReactNode)  → Platzhalter am Spaltenende (Drop-Target-Andeutung).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.toolbar]   - Modus-Switch + Filter-Slot
 * @param {React.ReactNode} [props.lanes]     - vollständige Lane-Reihe (bevorzugt)
 * @param {React.ReactNode} [props.column]    - Einzelspalte (Fallback ohne lanes)
 * @param {React.ReactNode} [props.card]      - Kartenkörper (Fallback ohne lanes)
 * @param {React.ReactNode} [props.backfill]  - Drop-/Leer-Platzhalter (Fallback)
 * @param {string} [props.dataUi]             - optionales data-ui-Hook (durchgereicht)
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children]  - lanes-Fallback (Back-Compat)
 */
export default function BoardPage({
  toolbar,
  lanes,
  column,
  card,
  backfill,
  dataUi,
  className = '',
  children,
}) {
  const laneContent = lanes ?? children

  return (
    <div
      data-ui={dataUi}
      className={`flex flex-col h-full overflow-hidden bg-[var(--base)] ${className}`}
    >
      {toolbar && (
        <div
          data-ui={dataUi ? `${dataUi}.toolbar` : undefined}
          className="flex items-center gap-3 px-5 py-2 bg-[var(--mantle)] border-b border-[var(--surface0)] shrink-0"
        >
          {toolbar}
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-auto px-5 py-4">
        <div
          data-ui={dataUi ? `${dataUi}.lanes` : undefined}
          className="flex gap-4 h-full min-w-max"
        >
          {laneContent ?? (
            <div
              data-ui={dataUi ? `${dataUi}.column` : undefined}
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
                    data-ui={dataUi ? `${dataUi}.card` : undefined}
                    className="rounded bg-[var(--base)] border border-[var(--surface0)] px-2.5 py-2 text-xs text-[var(--text)]"
                  >
                    {card}
                  </div>
                )}
                <div
                  data-ui={dataUi ? `${dataUi}.backfill` : undefined}
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
