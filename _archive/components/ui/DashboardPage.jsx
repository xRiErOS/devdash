import PageShell from './layout/PageShell.jsx'
import Grid from './layout/Grid.jsx'
import Card from './atoms/Card.jsx'

/**
 * DashboardPage — Archetyp-Organismus (DD-427, Frontend-Rework Phase 7).
 *
 * Eigener Page-Typ für Übersichts-/Kennzahl-Seiten (NICHT in FormPage/ListPage
 * falten). Baut auf dem PageShell-Slot-Vertrag (DD-415) auf und ordnet seine
 * Kennzahl-/Diagramm-Slots in einem auto-fit-Grid (ui/layout/Grid) an. Alle
 * Slot-Inhalte teilen EINEN Card-Look (ui/Card) — die View liefert nur den
 * Slot-Inhalt, das Archetyp-Layout schreibt Rahmen + Raster vor.
 *
 * Layout (oben → unten):
 *   1. optional `tabs`       — Bereichs-/Ansichts-Umschalter unter dem Header.
 *   2. `summaryCard` x N     — kompakte Kennzahl-Kacheln im engen auto-fit-Grid.
 *   3. `chartCard` x N       — größere Diagramm-/Detail-Karten im weiten Grid.
 *   4. `grid`                — freie Zusatz-Inhalte (eigene Komposition).
 *
 * @param {object} props
 * @param {string} [props.title] - View-Überschrift (PageShell-Header, links).
 * @param {React.ReactNode} [props.actions] - rechtsbündige Header-Aktionen.
 * @param {React.ReactNode} [props.tabs] - optionaler Umschalter unter dem Header.
 * @param {React.ReactNode|React.ReactNode[]} [props.summaryCard] - Kennzahl-Kachel(n); jede wird in einen Card-Look gehüllt.
 * @param {React.ReactNode|React.ReactNode[]} [props.chartCard] - Diagramm-Karte(n); jede wird in einen Card-Look gehüllt.
 * @param {React.ReactNode} [props.grid] - freier Zusatz-Bereich unter den Karten.
 * @param {'md'|'lg'|'full'} [props.width='full'] - durchgereichte PageShell-Breite.
 * @param {string} [props.dataUi] - optionales data-ui-Attribut für den Wurzel-Container.
 * @param {string} [props.className]
 */
export default function DashboardPage({
  title,
  actions,
  tabs,
  summaryCard,
  chartCard,
  grid,
  width = 'full',
  dataUi,
  className = '',
}) {
  const summaries = summaryCard == null ? [] : [].concat(summaryCard)
  const charts = chartCard == null ? [] : [].concat(chartCard)

  const content = (
    <div className={`flex flex-col gap-4 ${className}`} data-ui={dataUi}>
      {tabs && <div className="flex items-center gap-2">{tabs}</div>}

      {summaries.length > 0 && (
        <Grid min="14rem" gap="md" data-ui="dashboard.summary-grid">
          {summaries.map((node, i) => (
            <Card key={i} tone="mantle" padding="md">
              {node}
            </Card>
          ))}
        </Grid>
      )}

      {charts.length > 0 && (
        <Grid min="22rem" gap="md" data-ui="dashboard.chart-grid">
          {charts.map((node, i) => (
            <Card key={i} tone="mantle" padding="md">
              {node}
            </Card>
          ))}
        </Grid>
      )}

      {grid && <div data-ui="dashboard.grid">{grid}</div>}
    </div>
  )

  return <PageShell title={title} actions={actions} content={content} width={width} />
}
