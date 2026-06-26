/**
 * DetailLayout — geteilte Content-Wahrheit der drei Detail-Screens
 * (Issue/Sprint/Milestone). Domänenfrei: nimmt PageTitle-Props (`title`) und
 * beliebige Widget-Children und ordnet sie als Lead-Panel + 2-Spalten-Widget-Grid.
 *
 * Komposition: `PageTitle` (Organism). Layout über Tailwind-Grid (auf schmalen
 * Viewports 1-spaltig, ab md 2-spaltig; volle Widgets setzen `md:col-span-2`).
 * Presentational — die Screens füllen `title` + `children` mit Fixture-Daten.
 *
 * @param {object} props
 * @param {object} props.title - Props für PageTitle (kind,id,name,status,meta…)
 * @param {React.ReactNode} props.children - Widget-Organismen
 * @param {string} [props.dataUiScope='screen.detailLayout']
 * @param {string} [props.className]
 */
import PageTitle from '../organisms/base/PageTitle.jsx'

export default function DetailLayout({ title, children, dataUiScope = 'screen.detailLayout', className = '' }) {
  return (
    <div data-ui={dataUiScope} className={`flex flex-col ${className}`}>
      <PageTitle {...title} dataUiScope={`${dataUiScope}.title`} className="mb-[var(--space-4)]" />
      <div data-ui={`${dataUiScope}.widgets`} className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-4)] items-stretch">
        {children}
      </div>
    </div>
  )
}
