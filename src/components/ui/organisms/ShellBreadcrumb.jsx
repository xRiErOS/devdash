import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { getActiveSlug, getActiveProjectId, subscribeProject } from '../../../lib/projectStore.js'
import { resolveViewLabel } from '../../../lib/pageHeaderLabel.js'

/**
 * ShellBreadcrumb — DD-497 (REQ-16, T03, FEAT-08). Shell-owned, auto-ableitende
 * Entity-Breadcrumb im AppShell-Header. Leitet aus Route + Daten die Kette
 * Home › Projekt-Slug › [Milestone] › [Sprint] › Issue ab; jede Ebene verlinkt,
 * nicht zugeordnete Ebenen werden ausgelassen. Ersetzt die lokalen View-Breadcrumbs
 * (PO D01/DD74-D07). Token-clean: 0 inline-style, 0 Raw-Hex.
 *
 * Parent-Resolve: issue.assigned_sprint → sprint → sprint.milestone_id → milestone.
 * Issue-Route nutzt project_number (DD-378) → kanonische Auflösung via by-number.
 */

const LINK_CLS = 'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[var(--subtext0)] no-underline hover:bg-[var(--surface0)] hover:text-[var(--text)] transition-colors'
const CURRENT_CLS = 'inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[var(--text)] font-semibold truncate max-w-[220px]'

function useJson(url, deps) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!url) { setData(null); return }
    let cancelled = false
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return data
}

export default function ShellBreadcrumb() {
  const params = useParams()
  const loc = useLocation()
  const [projectId, setProjectId] = useState(getActiveProjectId())
  useEffect(() => subscribeProject(setProjectId), [])

  const slug = params.slug || getActiveSlug()
  const segs = loc.pathname.split('/').filter(Boolean)
  const viewSeg = slug && segs[0] === slug ? segs[1] || '' : ''
  const detailId = (viewSeg === 'issues' || viewSeg === 'sprints' || viewSeg === 'milestones' || viewSeg === 'review')
    ? segs[2]
    : undefined

  // Caches — nur laden wenn eine Entity-Route eine Eltern-Auflösung braucht.
  const needsEntities = !!detailId && (viewSeg === 'issues' || viewSeg === 'sprints' || viewSeg === 'milestones' || viewSeg === 'review')
  const sprints = useJson(needsEntities ? '/api/sprints' : null, [projectId, needsEntities])
  // status=all + deferred: die Eltern-Milestone einer Issue/eines Sprints kann bereits
  // completed/deferred sein — der Default-Filter (nur open) würde sie verschlucken.
  const milestones = useJson(needsEntities ? '/api/milestones?status=all&include_deferred=true' : null, [projectId, needsEntities])
  const issue = useJson(
    viewSeg === 'issues' && detailId ? `/api/projects/${projectId}/issues/by-number/${detailId}` : null,
    [projectId, viewSeg, detailId],
  )

  const crumbs = useMemo(() => {
    const sprintList = Array.isArray(sprints) ? sprints : []
    const msList = Array.isArray(milestones) ? milestones : []
    const findSprint = id => sprintList.find(s => String(s.id) === String(id))
    const findMs = id => msList.find(m => String(m.id) === String(id))

    // Globale (projektlose) Routen.
    if (!slug || segs[0] !== slug) {
      if (segs[0] === 'projects') return [{ label: 'Projekte', home: true, key: 'projects' }]
      if (segs[0] === 'settings') {
        return [
          { label: 'Home', to: '/projects', home: true, key: 'home' },
          { label: 'Globale Einstellungen', key: 'settings' },
        ]
      }
      return [{ label: 'Home', home: true, key: 'home' }]
    }

    const out = [{ label: 'Home', to: '/projects', home: true, key: 'home' }]
    const projectCrumb = { label: slug, to: `/${slug}/home`, key: 'project' }

    if (!viewSeg || viewSeg === 'home') {
      out.push({ ...projectCrumb, to: undefined })
      return out
    }
    out.push(projectCrumb)

    const pushMilestone = (mid, current) => {
      if (!mid) return
      const m = findMs(mid)
      out.push({ label: m?.name || `M${mid}`, to: current ? undefined : `/${slug}/milestones/${mid}`, key: 'milestone' })
    }
    const pushSprint = (sid, current) => {
      const s = findSprint(sid)
      if (!s && current) return
      out.push({ label: s?.key || `Sprint ${sid}`, to: current ? undefined : `/${slug}/sprints/${sid}`, key: 'sprint' })
    }

    if (viewSeg === 'issues' && detailId) {
      const sid = issue?.assigned_sprint
      const sprint = sid ? findSprint(sid) : null
      pushMilestone(sprint?.milestone_id, false)
      if (sid) pushSprint(sid, false)
      out.push({ label: issue?.key || `#${detailId}`, key: 'issue' })
    } else if ((viewSeg === 'sprints' || viewSeg === 'review') && detailId) {
      const sprint = findSprint(detailId)
      pushMilestone(sprint?.milestone_id, false)
      pushSprint(detailId, true)
    } else if (viewSeg === 'milestones' && detailId) {
      pushMilestone(detailId, true)
    } else {
      out.push({ label: resolveViewLabel(loc.pathname), key: viewSeg })
    }
    return out
  }, [slug, segs, viewSeg, detailId, sprints, milestones, issue, loc.pathname])

  return (
    <nav aria-label="Breadcrumb" data-ui="app-shell.breadcrumb" className="flex items-center gap-0.5 min-w-0 overflow-hidden font-[family-name:var(--font-display)] text-[13px]">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        const key = c.key || (last ? 'current' : `crumb-${i}`)
        const ui = `app-shell.breadcrumb.${key}`
        const inner = (<>{c.home && <Home size={14} className="shrink-0" />}<span className="truncate">{c.label}</span></>)
        return (
          <Fragment key={key + i}>
            {i > 0 && <ChevronRight size={13} className="shrink-0 text-[var(--overlay0)]" />}
            {last || !c.to
              ? <span aria-current="page" data-ui={ui} className={CURRENT_CLS}>{inner}</span>
              : <Link to={c.to} data-ui={ui} className={LINK_CLS}>{inner}</Link>}
          </Fragment>
        )
      })}
    </nav>
  )
}
