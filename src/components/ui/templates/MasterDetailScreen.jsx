import EntityDetailHeader from '../molecules/EntityDetailHeader.jsx'
import MasterDetail from './MasterDetail.jsx'

/**
 * MasterDetailScreen — Tier-07-Template (Page-Archetyp, OHNE Domänenwissen). Generisches
 * Layout-Gerüst: ein seiten-breiter PageTitle (EntityDetailHeader, size="page") über einem
 * Master-Detail (Listen-Sidebar + Detail-Pane). Aus dem Sprint/Issue-Review-Screen extrahiert,
 * wiederverwendbar für gleichartige Review-/Workflow-Screens (z.B. Memory-Review).
 *
 * Reine Props/Slots — keine Daten, kein Fetch, keine Domänen-Begriffe. Der Consumer baut die
 * Sidebar (Suche/Filter/Liste/Footer-Aktion) und den Detail-Inhalt und reicht sie als Slots ein.
 *
 * @param {object} props
 * @param {{id?, title, goal?, pills?, action?}} props.header - Felder für den EntityDetailHeader (size="page").
 * @param {import('react').ReactNode} props.sidebar - Master-Slot (linke Spalte).
 * @param {import('react').ReactNode} props.detail - Detail-Slot (rechte Spalte).
 * @param {string} [props.sideWidth='320px']
 * @param {'mantle'|'base'|'surface0'} [props.sidebarSurface='base'] - Canon-Farbleiter (01.15): List-Panel = Content-Canvas = base (wie Detail-Pane); Listen-Items darin sind die Cards (surface0).
 * @param {'base'|'layer-1'|'layer-2'|'layer-3'|'layer-4'|'mantle'|'surface0'} [props.paneSurface='base'] - Detail-Pane-Canvas (Default base, identisch zum Bestand).
 * @param {string} [props.rootDataUi='master-detail-screen'] - data-ui der Wurzel.
 * @param {string} [props.pageTitleDataUi] - data-ui des PageTitle-Wrappers (Default `${rootDataUi}.page-title`).
 * @param {string} [props.masterDetailScope] - dataUiScope des Master-Detail (Default = rootDataUi).
 */
export default function MasterDetailScreen({
  header = {},
  sidebar,
  detail,
  sideWidth = '320px',
  sidebarSurface = 'base',
  paneSurface = 'base',
  rootDataUi = 'master-detail-screen',
  pageTitleDataUi,
  masterDetailScope,
}) {
  return (
    <div data-ui={rootDataUi} className="flex h-full flex-col gap-2">
      <div data-ui={pageTitleDataUi || `${rootDataUi}.page-title`}>
        <EntityDetailHeader size="page" {...header} />
      </div>
      <div className="min-h-0 flex-1">
        <MasterDetail
          dataUiScope={masterDetailScope || rootDataUi}
          sideWidth={sideWidth}
          sidebarSurface={sidebarSurface}
          paneSurface={paneSurface}
          sidebar={sidebar}
          pane={detail}
        />
      </div>
    </div>
  )
}
