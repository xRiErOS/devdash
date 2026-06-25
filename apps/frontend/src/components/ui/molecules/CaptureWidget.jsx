/**
 * CaptureWidget — Molecule (04.40 Data Display). Präsentationale Layout-Grundlage für
 * ALLE erfassenden Widgets (DoD, künftige Checklisten/Listen). Gibt das Gerüst vor;
 * der Konsument liefert Slot-Inhalte + Metrik-Knoten (keine Logik hier).
 *
 * Aufbau (oben → unten):
 *   toolbar  — optionales Label LINKS + 4 optionale Slots: search · sort · filter · create
 *              (label linksbündig, create rechtsbündig via ml-auto)
 *   body     — die Daten-Liste (children)
 *   metrics  — 1–3 rechtsbündige Metrik-Knoten unten (max 3, Rest wird gekappt)
 *
 * DEFAULT RANDLOS (kein Rahmen, keine Tönung) — fügt sich in randlose EntityDetails-
 * WidgetSlots (luftiges Terminal-Design). `framed` = optionaler Rahmen + Tönung für
 * Standalone-Einsatz. Border + blur-Backdrop gehören ausschließlich zu Modal/Overlay/
 * Form, NICHT zum slot-komponierten Widget (D02). Mono (--font-display), token-clean.
 *
 * Metriken sind ReactNode[] (vom Konsumenten gerendert) → Content-Identität bleibt beim
 * Konsumenten (z.B. DoD behält `dod-widget.progress`). CaptureWidget ordnet nur an.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.toolbarLabelSlot] - Label LINKS in der Toolbar-Zeile
 *        (z.B. ein `// `-CommentLabel). Gesetzt → Toolbar rendert auch ohne weitere Slots.
 * @param {import('react').ReactNode} [props.searchSlot]  - Such-Eingabe (fehlt → kollabiert).
 * @param {import('react').ReactNode} [props.sortSlot]    - Sortier-Control.
 * @param {import('react').ReactNode} [props.filterSlot]  - Filter-Control.
 * @param {import('react').ReactNode} [props.createSlot]  - Erfassen-Aktion (rechtsbündig).
 * @param {Array<import('react').ReactNode>} [props.metrics=[]] - 1–3 Metrik-Knoten unten-rechts.
 * @param {boolean} [props.framed=false] - Rahmen + Tönung für Standalone (Default randlos).
 * @param {string} [props.dataUiScope='capture-widget'] - parametrisierter data-ui-Wurzelbereich;
 *        erlaubt Mehrfach-Instanzen in einem Composer ohne Anker-Kollision (alle Chrome-Anker
 *        leiten sich daraus ab). Default unverändert → backward-compat.
 * @param {import('react').ReactNode} [props.children]    - body (Daten-Liste).
 * @param {string} [props.className]
 */
const FRAME =
  'rounded-[var(--radius-sm)] border border-[var(--surface2)] bg-[color-mix(in_oklab,var(--surface0)_60%,transparent)] p-3'

export default function CaptureWidget({
  toolbarLabelSlot,
  searchSlot,
  sortSlot,
  filterSlot,
  createSlot,
  metrics = [],
  framed = false,
  dataUiScope = 'capture-widget',
  children,
  className = '',
  ...rest
}) {
  const hasToolbar = Boolean(toolbarLabelSlot || searchSlot || sortSlot || filterSlot || createSlot)
  const shownMetrics = metrics.slice(0, 3)

  return (
    <div
      data-ui={dataUiScope}
      className={`group [font-family:var(--font-display)] space-y-3${framed ? ` ${FRAME}` : ''} ${className}`}
      {...rest}
    >
      {hasToolbar && (
        <div data-ui={`${dataUiScope}.toolbar`} className="flex items-center gap-2">
          {toolbarLabelSlot && (
            <div data-ui={`${dataUiScope}.toolbar-label`} className="min-w-0 shrink-0">
              {toolbarLabelSlot}
            </div>
          )}
          {searchSlot && (
            <div data-ui={`${dataUiScope}.search`} className="min-w-0 flex-1">
              {searchSlot}
            </div>
          )}
          {sortSlot && <div data-ui={`${dataUiScope}.sort`}>{sortSlot}</div>}
          {filterSlot && <div data-ui={`${dataUiScope}.filter`}>{filterSlot}</div>}
          {createSlot && (
            <div data-ui={`${dataUiScope}.create`} className="ml-auto shrink-0">
              {createSlot}
            </div>
          )}
        </div>
      )}

      <div data-ui={`${dataUiScope}.body`}>{children}</div>

      {shownMetrics.length > 0 && (
        <div
          data-ui={`${dataUiScope}.metrics`}
          className="flex items-center justify-end gap-4 text-[11px] text-[var(--subtext0)]"
        >
          {shownMetrics.map((m, i) => (
            <div key={i} data-ui={`${dataUiScope}.metric`}>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
