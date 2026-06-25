/**
 * MetaFieldGrid — Molecule (Extract aus ProjectMetaCard, PO-Feedback Sprint-Details
 * 2026-06-07: Drift-Risiko lokaler 2-Spalten-Meta-Layouts).
 *
 * Read-only Meta-Chips (Label-Caption + surface0-Chip-Wert) im n-Spalten-Grid —
 * der kanonische Baustein für Stammdaten-Übersichten (Projekt-Meta, Sprint-Meta, …).
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * ABGRENZUNG zu MetaCard (Molecule): MetaCard bringt die komplette Card-Shell
 * (CardHead, kein actions-Slot) mit und rendert eine EINSPALTIGE MetaRow-Liste —
 * für Meta-Listen in Seitenleisten (SettingsSidebar). MetaFieldGrid ist SHELL-LOS
 * (Card + Kopf baut der Konsument, z.B. h3 + Copy-IconButton) und rendert
 * Chip-Felder im 1–2-Spalten-Grid — für Stammdaten-Karten mit Copy-for-AI.
 * Konsolidierungs-Kandidat: MetaCard variant="rows|chips" könnte beide vereinen.
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex. Pfade/IDs via `mono` als
 * Monospace, lange Werte truncaten mit title-Tooltip.
 *
 * @param {object} props
 * @param {Array<{label: string, value?: (string|number|null), mono?: boolean, anchor?: string}>} [props.fields=[]]
 *   - Meta-Felder; `anchor` wird zum data-ui-Suffix (Fallback: label lowercase).
 * @param {1|2} [props.columns=2] - Spaltenzahl des Grids.
 * @param {string} [props.dataUiScope='meta-field-grid'] - Wurzel-data-ui-Bereich (I03/D01);
 *   Grid = `<scope>.grid`, Feld = `<scope>.<anchor>`.
 * @param {string} [props.className] - zusätzliche Klassen am Grid.
 */
// DD-516: 2-Spalten kollabieren unter `sm` (≥640px) auf 1 Spalte — verhindert
// horizontalen Overflow der Meta-Chips bei 375px (iPhone SE). Desktop unverändert.
const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
}

export default function MetaFieldGrid({
  fields = [],
  columns = 2,
  dataUiScope = 'meta-field-grid',
  className = '',
}) {
  return (
    <div data-ui={`${dataUiScope}.grid`} className={`grid ${COLS[columns] || COLS[2]} gap-x-3 gap-y-2.5 ${className}`}>
      {fields.map((field) => {
        const anchor = field.anchor || String(field.label).toLowerCase()
        const value = field.value == null || field.value === '' ? '—' : String(field.value)
        return (
          <div key={anchor} data-ui={`${dataUiScope}.${anchor}`} className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wide text-[var(--text)] mb-1">
              {field.label}
            </span>
            <span
              className={`block rounded-md border border-[var(--border-elevated)] bg-[var(--surface0)] px-2 py-1 text-xs text-[var(--text)] truncate ${field.mono ? 'font-mono' : ''}`}
              title={value === '—' ? undefined : value}
            >
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
