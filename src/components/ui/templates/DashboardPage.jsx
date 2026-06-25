/**
 * DashboardPage — kanonisches, token-sauberes Layout-Komposit (DD-481 Harvest aus
 * src/components/ui/DashboardPage.jsx, dem Phase-7-Archetyp DD-427).
 *
 * KPI-/Übersichts-Seiten-Skelett: PageShell-Rahmen (DD-415-Slot-Vertrag) plus
 * zwei auto-fit-Raster aus dem Grid-Atom, deren Slot-Inhalte EINEN gemeinsamen
 * Card-Look (Card-Atom) teilen. Die View liefert nur die Slot-Inhalte —
 * Rahmen, Raster und Kachel-Look schreibt dieses Komposit vor.
 *
 * TIER-EINSCHÄTZUNG (TIER-RECHECK, ehrlich): SHOULD_BE_TEMPLATE.
 * Diese Komponente kennt KEINE Domäne (kein Sprint/Issue/Milestone/Todo/Memory/
 * Review/SSTD/ApiKey/Tag-Wissen). Sie ist reines Seiten-Layout: benannte
 * Layout-Slots (title/actions/tabs/summaryCard/chartCard/grid) werden in ein
 * PageShell + zwei Grids + Card-Hüllen gemappt. Damit gehört sie tier-technisch
 * in die Template/Page-Schicht (vgl. die bereits existierenden ui/*Page.jsx-
 * Archetypen), NICHT zu den domänen-bewussten Organisms. Auf Auftrag (Batch 5)
 * trotzdem additiv im organisms-Namespace gebaut und hier geflaggt.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle: KEINE — der Phase-7-Archetyp war
 * bereits rein präsentational (alle Inhalte kamen schon als Slot-Props rein,
 * kein projectStore/apiClient/useEffect-Datenladen). Verlustfrei geharvestet;
 * die einzige strukturelle Änderung ist die Parametrisierung des data-ui-
 * Wurzel-bereichs (vorher freies `dataUi`-Attribut → jetzt `dataUiScope` mit
 * gepunkteten Sub-Ankern, I03/D01) und der Wechsel der Card/Grid-Importe auf
 * die kanonischen Atom-Pfade (../atoms/) statt der ui/layout-Varianten.
 *
 * Ephemerer UI-State: keiner (rein deklaratives Layout).
 *
 * Layout (oben → unten):
 *   1. optional `tabs`     — Bereichs-/Ansichts-Umschalter unter dem Header.
 *   2. `summaryCard` x N   — kompakte Kennzahl-Kacheln im engen auto-fit-Grid.
 *   3. `chartCard` x N     — größere Diagramm-/Detail-Karten im weiten Grid.
 *   4. `grid`              — freie Zusatz-Inhalte (eigene Komposition).
 *
 * @param {object} props
 * @param {string} [props.title] - View-Überschrift (PageShell-Header, links).
 * @param {React.ReactNode} [props.actions] - rechtsbündige Header-Aktionen.
 * @param {React.ReactNode} [props.tabs] - optionaler Umschalter unter dem Header.
 * @param {React.ReactNode|React.ReactNode[]} [props.summaryCard] - Kennzahl-Kachel(n); je in einen Card-Look gehüllt.
 * @param {React.ReactNode|React.ReactNode[]} [props.chartCard] - Diagramm-Karte(n); je in einen Card-Look gehüllt.
 * @param {React.ReactNode} [props.grid] - freier Zusatz-Bereich unter den Karten.
 * @param {'md'|'lg'|'full'} [props.width='full'] - durchgereichte PageShell-Breite.
 * @param {string} [props.dataUiScope='dashboard-page'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert).
 * @param {string} [props.className] - zusätzliche Klassen am Inhalts-Container.
 */

import PageShell from '../layout/PageShell.jsx'
import Grid from '../layout/Grid.jsx'
import Card from '../atoms/Card.jsx'

export default function DashboardPage({
  title,
  actions,
  tabs,
  summaryCard,
  chartCard,
  grid,
  width = 'full',
  dataUiScope = 'dashboard-page',
  className = '',
}) {
  const summaries = summaryCard == null ? [] : [].concat(summaryCard)
  const charts = chartCard == null ? [] : [].concat(chartCard)

  const content = (
    <div className={`flex flex-col gap-4 ${className}`} data-ui={dataUiScope}>
      {tabs && (
        <div data-ui={`${dataUiScope}.tabs`} className="flex items-center gap-2">
          {tabs}
        </div>
      )}

      {summaries.length > 0 && (
        <Grid min="14rem" gap="md" data-ui={`${dataUiScope}.summary-grid`}>
          {summaries.map((node, i) => (
            <Card key={i} tone="mantle" padding="md" data-ui={`${dataUiScope}.summary-card`}>
              {node}
            </Card>
          ))}
        </Grid>
      )}

      {charts.length > 0 && (
        <Grid min="22rem" gap="md" data-ui={`${dataUiScope}.chart-grid`}>
          {charts.map((node, i) => (
            <Card key={i} tone="mantle" padding="md" data-ui={`${dataUiScope}.chart-card`}>
              {node}
            </Card>
          ))}
        </Grid>
      )}

      {grid && <div data-ui={`${dataUiScope}.grid`}>{grid}</div>}
    </div>
  )

  return <PageShell title={title} actions={actions} content={content} width={width} />
}
