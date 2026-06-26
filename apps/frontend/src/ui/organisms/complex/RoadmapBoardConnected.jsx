/**
 * RoadmapBoardConnected — dünner Connected-Wrapper um den presentational
 * `RoadmapBoard` (Promote-Loop Phase 3, erster Connected-Wrapper im Repo).
 *
 * Holt echte Daten via `src/lib/roadmapApi.js` (fetch + Zod-Validierung), hält
 * `loading/error/data` im lokalen State und reicht sie als Props in die EINE
 * Board-Komponente — Story und Prod rendern dasselbe Bauteil (Alignment-Garantie).
 * Keine eigene Darstellung, keine DnD-Logik: Reorder/Card-Move-Callbacks gehen
 * nach `reorderMilestones`/`moveSprint` (optimistische UI bleibt im Organismus).
 *
 * SSR/Render-Smoke: `useEffect` läuft nicht → initialer Render zeigt den
 * Skeleton (loading=true), kein Fetch. Im Browser-Storybook bedient MSW die Calls.
 *
 * @param {object} props
 * @param {number} [props.projectId] - Projekt-Scope (X-Project-Id); default Backend = 1
 * @param {boolean} [props.wide=false]
 * @param {'mandatory'|'proximity'|'none'} [props.snap='mandatory']
 * @param {(sprint:object)=>void} [props.onOpenSprint]
 * @param {(milestoneId:number)=>void} [props.onOpenMilestone]
 * @param {string} [props.dataUiScope='organism.roadmapBoardConnected']
 * @param {string} [props.className]
 */
import { useState, useEffect, useCallback } from 'react'
import RoadmapBoard from './RoadmapBoard.jsx'
import { fetchRoadmap, reorderMilestones, moveSprint } from '../../../lib/roadmapApi.js'

export default function RoadmapBoardConnected({
  projectId, wide = false, snap = 'mandatory', onOpenSprint, onOpenMilestone,
  dataUiScope = 'organism.roadmapBoardConnected', className = '',
}) {
  const [data, setData] = useState({ milestones: [], deps: [], unassignedSprints: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRoadmap({ projectId })
      .then((board) => { if (!cancelled) setData(board) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Laden fehlgeschlagen') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId, reloadKey])

  const handleRetry = useCallback(() => setReloadKey((k) => k + 1), [])

  // Persistenz-Echos. Fehler werden geloggt, nicht in den Error-State gehoben —
  // die optimistische UI im Organismus bleibt erhalten (Augenschein/Reload korrigiert).
  const handleReorder = useCallback((payload) => {
    reorderMilestones(payload, { projectId }).catch((e) => console.warn('[RoadmapBoardConnected] reorder', e))
  }, [projectId])

  const handleCardMove = useCallback((sprintId, move) => {
    moveSprint(sprintId, move, { projectId }).catch((e) => console.warn('[RoadmapBoardConnected] cardMove', e))
  }, [projectId])

  return (
    <div data-ui={dataUiScope} className={className}>
      <RoadmapBoard
        milestones={data.milestones}
        unassignedSprints={data.unassignedSprints}
        deps={data.deps}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        wide={wide}
        snap={snap}
        onOpenSprint={onOpenSprint}
        onOpenMilestone={onOpenMilestone}
        onReorder={handleReorder}
        onCardMove={handleCardMove}
        dataUiScope={`${dataUiScope}.board`}
      />
    </div>
  )
}
