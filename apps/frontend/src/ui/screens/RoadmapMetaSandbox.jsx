/**
 * RoadmapMetaSandbox — explorative Spielwiese (KEIN Prod-Screen): stellt das
 * RoadmapBoard neben das MetaPanel und macht die offenen Layout-/Panel-Forks als
 * Props/Controls erfahrbar. Dient der PO-Entscheidung, welche Variante in den
 * echten RoadmapBoardScreen promotet wird.
 *
 * Forks:
 *   - panelMode 'on-select' → Panel nur bei Auswahl (Board füllt sonst die Breite,
 *     reflowt schmaler bei Auswahl) · 'always' → Panel dauerhaft rechts (Platzhalter
 *     ohne Auswahl).
 *   - selected 'none' | 'sprint' | 'milestone' → welche Entität das Panel zeigt
 *     (Mockup: arg-gesteuert, NICHT per Klick ins Board verdrahtet — das wäre Promote).
 *   - collapsed → MetaPanel als schmale Rail.
 *
 * Presentational: Board-Daten aus Fixtures, Status-Wechsel/Detail-Öffnen als Spies.
 *
 * @param {object} props
 * @param {'on-select'|'always'} [props.panelMode='on-select']
 * @param {'none'|'sprint'|'milestone'} [props.selected='none']
 * @param {boolean} [props.collapsed=false]
 * @param {Array} [props.milestones=[]]
 * @param {Array} [props.unassignedSprints=[]]
 * @param {Array} [props.deps=[]]
 * @param {(payload:object)=>void} [props.onTransition]
 * @param {()=>void} [props.onOpenDetail]
 * @param {string} [props.dataUiScope='screen.roadmapMetaSandbox']
 */
import { useState, useEffect } from 'react'
import RoadmapBoard from '../organisms/complex/RoadmapBoard.jsx'
import MetaPanel from '../organisms/complex/MetaPanel.jsx'

// Sample-Entitäten (Form wie milestone-list.json). Im Mockup arg-gewählt statt
// per Klick selektiert.
const SAMPLE_SPRINT = {
  kind: 'sprint', id: 106, key: 'DD2#52', name: 'RoadmapBoard Mockup',
  status: 'active', target_date: '2026-09-01', position: 0, issue_total: 9, issue_done: 4,
}
const SAMPLE_MILESTONE = {
  kind: 'milestone', id: 3, name: 'Roadmap & Planung',
  status: 'planning', target_date: '2026-09-01', dod_total: 5,
  sprints: [{ id: 106 }, { id: 107 }],
}

function pickEntity(selected) {
  if (selected === 'sprint') return SAMPLE_SPRINT
  if (selected === 'milestone') return SAMPLE_MILESTONE
  return null
}

export default function RoadmapMetaSandbox({
  panelMode = 'on-select', selected = 'none', collapsed = false,
  milestones = [], unassignedSprints = [], deps = [],
  onTransition, onOpenDetail,
  dataUiScope = 'screen.roadmapMetaSandbox', className = '',
}) {
  const [railed, setRailed] = useState(collapsed)
  useEffect(() => { setRailed(collapsed) }, [collapsed])

  const entity = pickEntity(selected)
  const showPanel = panelMode === 'always' || entity != null

  return (
    <div data-ui={dataUiScope} className={`flex flex-col gap-[var(--space-4)] p-[var(--space-5)] min-h-screen bg-[var(--base)] ${className}`}>
      <div data-ui={`${dataUiScope}.note`} className="text-[11px] text-[var(--subtext0)]">
        Sandbox · panelMode=<b className="text-[var(--text)]">{panelMode}</b> · selected=<b className="text-[var(--text)]">{selected}</b> · Auswahl arg-gesteuert (Mockup)
      </div>

      <div data-ui={`${dataUiScope}.row`} className="flex items-stretch gap-[var(--space-4)]">
        <div data-ui={`${dataUiScope}.boardArea`} className="flex-1 min-w-0">
          <RoadmapBoard
            milestones={milestones}
            unassignedSprints={unassignedSprints}
            deps={deps}
            dataUiScope={`${dataUiScope}.board`}
          />
        </div>

        {showPanel && (
          <MetaPanel
            entity={entity}
            collapsed={railed}
            onToggleCollapse={() => setRailed((v) => !v)}
            onTransition={onTransition}
            onOpenDetail={onOpenDetail}
            dataUiScope={`${dataUiScope}.panel`}
          />
        )}
      </div>
    </div>
  )
}
