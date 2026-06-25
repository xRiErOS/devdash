import Tabs from '../molecules/Tabs.jsx'
import EntityDetailHeader from '../molecules/EntityDetailHeader.jsx'
import ProjectHome from './ProjectHome.jsx'
import SstdSlotsWidget from './SstdSlotsWidget.jsx'
import SessionNotesWidget from './SessionNotesWidget.jsx'
import SopCollectionsView from './SopCollectionsView.jsx'

const noop = () => {}

// Tab-Inhalt-Map (S3 T2): pro Tab das jeweilige Bestands-/S2-Widget. Daten via Fixtures-Props
// (präsentational; Live = Backend-Track T-be1/T-be2). Unbekannte Tabs → defensiver Platzhalter.
const TAB_CONTENT = {
  home: (p) => <ProjectHome {...p.home} />,
  sstd: (p) => <SstdSlotsWidget {...p.sstd} />,
  sessionnotes: (p) => <SessionNotesWidget {...p.sessionnotes} />,
  sops: (p) => <SopCollectionsView {...p.sops} />,
}

// D-F (PO-R2/R3): exakt 4 Tabs, Home default. Frühere 9-Tab-Liste war halluziniert.
export const PROJECT_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'sstd', label: 'SSTD' },
  { id: 'sessionnotes', label: 'Session Notes' },
  { id: 'sops', label: 'SOPs' },
]

/**
 * ProjectPagesTabShell — Tab-Container (D-F). Reuse keyboard-/ARIA-fähige Tabs.jsx.
 * S3: alle 4 Tabs befüllt — home→ProjectHome, sstd→SstdSlotsWidget,
 * sessionnotes→SessionNotesWidget, sops→SopCollectionsView. Daten via Fixtures-Props.
 *
 * @param {object} props
 * @param {{ id: number, key: string, title: string, goal?: string }} props.project
 * @param {object} [props.home] - Props für ProjectHome
 * @param {object} [props.sstd] - Props für SstdSlotsWidget (slots/journal)
 * @param {object} [props.sessionnotes] - Props für SessionNotesWidget (notes/query/…)
 * @param {object} [props.sops] - Props für SopCollectionsView (sops/collections/…)
 * @param {string} [props.activeTab='home'] - aktiver Tab-Key (controlled)
 * @param {(id: string) => void} [props.onTabChange] - Callback bei Tab-Wechsel
 */
export default function ProjectPagesTabShell({
  project = {},
  home = {},
  sstd = {},
  sessionnotes = {},
  sops = {},
  activeTab = 'home',
  onTabChange = noop,
}) {
  const tabProps = { home, sstd, sessionnotes, sops }
  return (
    <div data-ui="project-pages" className="flex flex-col gap-3">
      <EntityDetailHeader
        id={project.key}
        title={project.title}
        goal={project.goal}
        size="page"
        background="mantle"
      />
      <Tabs tabs={PROJECT_TABS} value={activeTab} onChange={onTabChange}>
        {(active) => {
          const render = TAB_CONTENT[active]
          return render ? (
            render(tabProps)
          ) : (
            <div data-ui="project-pages.placeholder" className="p-6 text-[var(--subtext0)] text-sm">
              {`Tab „${PROJECT_TABS.find((t) => t.id === active)?.label ?? active}" — folgt.`}
            </div>
          )
        }}
      </Tabs>
    </div>
  )
}
