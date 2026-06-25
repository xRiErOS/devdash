import { createElement, isValidElement } from 'react'
import PageShell from './layout/PageShell.jsx'
import Grid from './layout/Grid.jsx'

/**
 * ListPage — Archetyp-Organismus (DD-423). Vorschreibendes Page-Skelett für
 * filterbare Listen-Views (Backlog, Memories, Trash, …). Statt freier
 * Per-View-Komposition rastet eine View nur noch in die benannten Slots ein.
 *
 * Rahmen läuft über {@link PageShell} (title/actions/content). Die List-Slots
 * stapeln vertikal: filterBar über der collection, emptyState als alternativer
 * Zustand bei leerer collection, bulkBar als Sticky-Bottom-Leiste.
 *
 * EIN Row-Typ erzwungen: `rowOrganism` ist EINE Komponente bzw. Render-Funktion,
 * die auf jedes `collection`-Item angewandt wird — kein Per-Row-Eigenbau.
 *
 * PFLICHT-Slot `emptyState`: ist die collection leer UND kein emptyState
 * übergeben, rendert ListPage einen sichtbaren Fehler-Marker
 * (`data-archetype-error`) statt stiller Leere — der Vertrag ist hart.
 *
 * `layout` (DD-439/D01): `stack` = vertikale Liste (default), `grid` = Auto-Fit-
 * Raster über die {@link Grid}-Primitive (für Card-Grid-Views wie ProjectsLanding).
 * `loadingState`/`errorState` (DD-438/D01) sind optionale Vorrang-Slots: sind sie
 * gesetzt (truthy), verdrängen sie collection/emptyState — loadingState vor
 * errorState. Damit muss die View kein Eigen-Layout für Lade-/Fehlerzustand bauen.
 *
 * @param {object} props
 * @param {string} [props.title] - View-Überschrift (PageShell-Header).
 * @param {React.ReactNode} [props.actions] - rechtsbündige Header-Aktionen.
 * @param {React.ReactNode} [props.filterBar] - Filterleiste über der collection.
 * @param {Array<any>} [props.collection=[]] - Datensätze; je Item ein rowOrganism.
 * @param {React.ComponentType<{item:any,index:number}>} props.rowOrganism
 *        EINE Row-Komponente, uniform mit { item, index } auf jedes
 *        collection-Item angewandt (kein Per-Row-Eigenbau).
 * @param {React.ReactNode} props.emptyState - PFLICHT-Slot: Inhalt bei leerer collection.
 * @param {React.ReactNode} [props.loadingState] - Vorrang-Slot: Ladezustand (truthy = aktiv).
 * @param {React.ReactNode} [props.errorState] - Vorrang-Slot: Fehlerzustand (truthy = aktiv).
 * @param {React.ReactNode} [props.bulkBar] - Sticky-Bottom-Massenaktionsleiste.
 * @param {(item:any,index:number)=>(string|number)} [props.rowKey] - Key-Ableitung je Item.
 * @param {'stack'|'grid'} [props.layout='stack'] - Collection-Layout: Liste oder Auto-Fit-Raster.
 * @param {string} [props.gridMin='16rem'] - minimale Spaltenbreite im grid-Layout (rem, kein px).
 * @param {'md'|'lg'|'full'} [props.width='lg'] - PageShell-Breite.
 * @param {string} [props.className]
 * @param {string} [props.dataUi] - optionales data-ui (durchgereicht, nicht hardcoded).
 * @param {object} [props.collectionProps] - zusätzliche Attribute (z.B. data-testid,
 *        data-ui) am collection-Container; durchgereicht, nicht hardcoded. Erlaubt
 *        Views, ihre Bestands-Selektoren am Listen-Knoten zu erhalten.
 */
export default function ListPage({
  title,
  actions,
  filterBar,
  collection = [],
  rowOrganism,
  emptyState,
  loadingState,
  errorState,
  bulkBar,
  rowKey,
  layout = 'stack',
  gridMin = '16rem',
  width = 'lg',
  className = '',
  dataUi,
  collectionProps,
}) {
  const isEmpty = !Array.isArray(collection) || collection.length === 0

  // EIN Row-Typ: rowOrganism ist EINE Komponente (oder Render-Funktion), die
  // uniform mit { item, index } aufgerufen wird — kein Per-Row-Eigenbau.
  const renderRow = (item, index) => {
    const key = rowKey ? rowKey(item, index) : (item?.id ?? index)
    const Row = rowOrganism
    let node
    if (typeof Row === 'function') {
      node = createElement(Row, { item, index })
    } else if (isValidElement(Row)) {
      node = Row
    } else {
      node = null
    }
    return (
      <div role="listitem" key={key}>
        {node}
      </div>
    )
  }

  let body
  if (loadingState) {
    body = (
      <div data-slot="loadingState" role="status">
        {loadingState}
      </div>
    )
  } else if (errorState) {
    body = (
      <div data-slot="errorState" role="alert">
        {errorState}
      </div>
    )
  } else if (isEmpty) {
    body = emptyState ? (
      <div data-slot="emptyState" role="status">
        {emptyState}
      </div>
    ) : (
      <div
        data-archetype-error="listpage-missing-emptyState"
        role="alert"
        className="rounded border border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-[var(--red)] text-sm px-3 py-2"
      >
        ListPage: emptyState-Slot fehlt bei leerer collection (Pflicht-Slot).
      </div>
    )
  } else if (layout === 'grid') {
    body = (
      <Grid data-slot="collection" role="list" min={gridMin} gap="md" {...collectionProps}>
        {collection.map(renderRow)}
      </Grid>
    )
  } else {
    body = (
      <div data-slot="collection" role="list" className="flex flex-col" {...collectionProps}>
        {collection.map(renderRow)}
      </div>
    )
  }

  const content = (
    <div className="flex flex-col gap-3" data-archetype="ListPage" data-ui={dataUi}>
      {filterBar && (
        <div data-slot="filterBar" role="search">
          {filterBar}
        </div>
      )}
      {body}
    </div>
  )

  return (
    <div className={`relative ${className}`}>
      <PageShell title={title} actions={actions} content={content} width={width} />
      {bulkBar && (
        <div
          data-slot="bulkBar"
          role="toolbar"
          className="sticky bottom-0 z-40 mt-3 border-t border-[var(--surface0)] bg-[var(--crust)] px-4 py-2 flex items-center gap-2"
        >
          {bulkBar}
        </div>
      )}
    </div>
  )
}
