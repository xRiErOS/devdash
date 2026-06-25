// DD-486 — OverviewTab: full SOLL composition (6 live cards).
// Replaces the stub (DD-282). Mirrors ProjectHomeTarget from
// src/components/screens/ProjectHome.stories.jsx (PO-approved visual contract).
//
// mainContent (2-col grid):
//   LEFT  — ProjectSummary (inlined, session-local state; DD-490 will add persistence)
//           + VisionGoalsCard
//   RIGHT — TodosColumn (useProjectTodos, filterAndSortTodos, SegmentedControl)
//
// sidebar (340px ↔ 48px, controlled by sidebarCollapsed prop from ProjectHomeView):
//   ProjectMetaCard + CurrentMilestoneCard + Next3SprintsCard
//
// Data-wiring:
//   Todos       → useProjectTodos(projectId)
//   Project     → useActiveProject()
//   Milestones  → GET /api/milestones (bare fetch + X-Project-Id header, mounted in useEffect)
//   Sprints     → GET /api/sprints (bare fetch + X-Project-Id header, mounted in useEffect)
//
// DD-676: ProjectMetaCard copy is a schlanker AI-/CLI-Handoff — nur Stammdaten
//         + MCP-Abruf-Hinweise (buildMetaCopyPayload, kein SSTD-Dump mehr).
// Out of scope: drag-rank (DD-489), summary/vision/goals persistence (DD-490),
//               SSTD-tab Copy-Full (DD-494).
//
// TOKEN-CLEAN: 0 inline-style literals. All surfaces/colors via Tailwind-v4-arbitrary
// Catppuccin tokens.

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, Copy } from 'lucide-react'
import { useActiveProject } from '../../../hooks/useActiveProject.js'
import { useProjectTodos } from '../../../hooks/useProjectTodos.js'
import useMediaQuery from '../../../hooks/useMediaQuery.js'
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext.jsx'
import { filterAndSortTodos } from '../../../lib/todoFilter.js'
import { buildMetaCopyPayload } from '../../../lib/metaCopyPayload.js'
import { computeSliceReorder, applyReorder } from '../../../lib/sprintReorder.js'
import { useProjectNav } from '../../../lib/useProjectNav.js'
import Stack from '../layout/Stack.jsx'
import Card from '../atoms/Card.jsx'
import CardHead from '../atoms/CardHead.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Cluster from '../layout/Cluster.jsx'
import Input from '../atoms/Input.jsx'
import TodoCliHelp from '../molecules/TodoCliHelp.jsx'
import SegmentedControl from '../molecules/SegmentedControl.jsx'
import ChecklistInputForm from './ChecklistInputForm.jsx'
import ProjectTodoList from './ProjectTodoList.jsx'
import ChecklistDetailModal from './ChecklistDetailModal.jsx'
import VisionGoalsCard from './VisionGoalsCard.jsx'
import ProjectMetaCard from './ProjectMetaCard.jsx'
import CurrentMilestoneCard from './CurrentMilestoneCard.jsx'
import Next3SprintsCard from './Next3SprintsCard.jsx'
import TextEditModal from './TextEditModal.jsx'
import MilestoneCreateModal from './MilestoneCreateModal.jsx'
import SprintFormModal from './SprintFormModal.jsx'

const SCOPE = 'project-home'

const DONE_SPRINT_STATUSES = ['completed', 'closed', 'cancelled']

// ── Summary box (inlined from story — no separate organism file for this shape) ──

const SUMMARY_BOX_CLS = 'rounded-lg border border-[var(--surface2)] bg-[var(--base)] p-3'
const SUMMARY_LABEL_CLS = 'block text-[11px] uppercase tracking-wide text-[var(--subtext0)]'

function SummaryBox({ anchor, label, editLabel, text, onEdit }) {
  return (
    <div data-ui={`${SCOPE}.summary.${anchor}`} className={SUMMARY_BOX_CLS}>
      <Cluster justify="between" className="mb-1 flex-nowrap">
        <span className={SUMMARY_LABEL_CLS}>{label}</span>
        {onEdit && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label={editLabel}
            onClick={onEdit}
            data-ui={`${SCOPE}.summary.${anchor}.edit`}
          />
        )}
      </Cluster>
      <p className="m-0 text-sm text-[var(--text)]">{text}</p>
    </div>
  )
}

// ── OverviewTab ──────────────────────────────────────────────────────────────────

export default function OverviewTab({ projectId, sidebarCollapsed = false }) {
  const { project } = useActiveProject()
  const navigate = useProjectNav()
  const issueMapRef = useRef(null)

  // --- Todos (live via useProjectTodos) ---
  const {
    todos,
    loading: todosLoading,
    error: todosError,
    create,
    patch,
    remove,
    reorder,
    addLink,
    removeLink,
  } = useProjectTodos(projectId)

  const { confirm } = useConfirmDialog()

  // DD-500-Fix: Der kanonische SortableTodoItem feuert onDelete ohne eigenen
  // Confirm (Kopplung in den Screen gehoben). Die Overview-Card braucht denselben
  // Confirm-Flow wie der TodoTab — sonst loescht Delete hier ohne Rueckfrage (e2e t07 Case 7).
  const handleDelete = async (id) => {
    const target = todos.find((t) => t.id === id)
    const ok = await confirm({
      title: 'ToDo löschen?',
      message: `"${target?.label ?? ''}" wird unwiderruflich entfernt.`,
      confirmLabel: 'Löschen',
      danger: true,
    })
    if (ok) remove(id)
  }

  const [todoDetail, setTodoDetail] = useState({ open: false, todo: null })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(id)
  }, [searchInput])

  const visibleTodos = useMemo(
    () => filterAndSortTodos(todos, { showAll, search }),
    [todos, showAll, search],
  )

  const handleToggleDone = (id, nextStatus) => patch(id, { status: nextStatus })

  const handleOpenIssue = async (issueKey) => {
    if (!issueKey || !projectId) return
    try {
      if (!issueMapRef.current) {
        const res = await fetch('/api/backlog', {
          headers: { 'X-Project-Id': String(projectId) },
        })
        const list = res.ok ? await res.json() : []
        issueMapRef.current = new Map(
          (Array.isArray(list) ? list : []).map(i => [i.key, i.id]),
        )
      }
      const id = issueMapRef.current.get(issueKey)
      if (id) navigate(`/issues/${id}`)
    } catch { /* no-op */ }
  }

  const NEW_TODO = { id: null, label: '', status: 'open', links: [] }

  // --- Summary / Vision / Goals (DD-490: persisted on the projects row) ---
  // Seeded from the loaded project (useActiveProject) and PUT back on save so the
  // values survive a reload. goals is stored newline-delimited (one goal per line).
  const [achieved, setAchieved] = useState('')
  const [next, setNext] = useState('')
  const [vision, setVision] = useState('')
  const [goals, setGoals] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => {
    if (!project) return
    setAchieved(project.summary_achieved ?? '')
    setNext(project.summary_next ?? '')
    setVision(project.vision ?? '')
    setGoals((project.goals ?? '').split('\n').filter(Boolean))
  }, [project])

  const openEdit = (cfg) => setEdit(cfg)
  const closeEdit = () => setEdit(null)

  // DD-490: persist a single changed field via PUT /api/projects/:id (bare fetch +
  // X-Project-Id header — same pattern as the milestones/sprints/backlog fetches
  // above). useActiveProject exposes no refetch, so we keep the optimistic local
  // state (it already matches what was saved).
  const persistSummaryField = (column, value) => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': String(projectId),
      },
      body: JSON.stringify({ [column]: value }),
    }).then((res) => {
      if (!res.ok) console.error('[DD-490] persist project summary failed:', res.status)
    }).catch((err) => { console.error('[DD-490] persist project summary error:', err) })
  }

  const handleSave = (text) => {
    switch (edit?.key) {
      case 'achieved':
        setAchieved(text); persistSummaryField('summary_achieved', text); break
      case 'next':
        setNext(text); persistSummaryField('summary_next', text); break
      case 'vision':
        setVision(text); persistSummaryField('vision', text); break
      case 'goals': {
        const list = text.split('\n').map(l => l.trim()).filter(Boolean)
        setGoals(list)
        persistSummaryField('goals', list.join('\n'))
        break
      }
      default: break
    }
    closeEdit()
  }

  // --- Project meta (live via useActiveProject) ---
  // DD-676: the copy is a schlanker AI-/CLI-Handoff — nur Projekt-Stammdaten
  // (id/slug/name/prefix/repo) + MCP-Abruf-Hinweise (NSP, Session-Notes, letzte
  // Memories). KEIN SSTD-Slot-Dump mehr (zu groß, für den Handoff nicht
  // nützlich); damit entfällt der DD-493-SSTD-Prefetch komplett. copyMeta
  // bleibt synchron (kein await vor writeText → Safari/Firefox User-Gesture-
  // Garantie); ProjectMetaCard schreibt + toastet via useCopyFeedback.
  const copyMeta = () => {
    if (!project) return null
    return buildMetaCopyPayload(project)
  }

  const copySummaryContext = () => {
    const text = [
      `# ${project?.name ?? 'Projekt'}`,
      '',
      `## Was wurde erreicht\n${achieved}`,
      '',
      `## Nächste Schritte\n${next}`,
      '',
      `## Vision\n${vision}`,
      '',
      `## Goals\n${goals.map(g => `- ${g}`).join('\n')}`,
    ].join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  // --- Milestones (live, derived predecessor/active/successor) ---
  const [milestones, setMilestones] = useState([])
  const [milestoneModal, setMilestoneModal] = useState(false)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch('/api/milestones', { headers: { 'X-Project-Id': String(projectId) } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setMilestones(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setMilestones([]) })
    return () => { cancelled = true }
  }, [projectId])

  const milestoneSeq = useMemo(() => {
    const sorted = [...milestones].sort(
      (a, b) => (a.position ?? a.id) - (b.position ?? b.id),
    )
    const activeIdx = sorted.findIndex(m => m.status === 'active')
    if (activeIdx !== -1) {
      return {
        predecessor: sorted[activeIdx - 1] ?? null,
        active: sorted[activeIdx],
        successor: sorted[activeIdx + 1] ?? null,
      }
    }
    // Fallback: first non-done milestone as current
    const fallback = sorted.findIndex(
      m => !['done', 'closed', 'cancelled'].includes(m.status),
    )
    if (fallback === -1) {
      return { predecessor: null, active: sorted[0] ?? null, successor: null }
    }
    return {
      predecessor: sorted[fallback - 1] ?? null,
      active: sorted[fallback],
      successor: sorted[fallback + 1] ?? null,
    }
  }, [milestones])

  // --- Sprints (live, next 3 non-done by position) ---
  const [sprints, setSprints] = useState([])
  const [sprintModal, setSprintModal] = useState(false)
  const [sprintSubmitting, setSprintSubmitting] = useState(false)
  const [sprintError, setSprintError] = useState('')

  // Reusable fetch — used on mount AND after a create so the new sprint appears.
  const loadSprints = useCallback(() => {
    if (!projectId) return Promise.resolve([])
    return fetch('/api/sprints', { headers: { 'X-Project-Id': String(projectId) } })
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setSprints(list)
        return list
      })
      .catch(() => { setSprints([]); return [] })
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch('/api/sprints', { headers: { 'X-Project-Id': String(projectId) } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setSprints(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setSprints([]) })
    return () => { cancelled = true }
  }, [projectId])

  const next3Sprints = useMemo(
    () =>
      [...sprints]
        .filter(s => !DONE_SPRINT_STATUSES.includes(s.status))
        .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id))
        .slice(0, 3),
    [sprints],
  )

  // DD-489 — re-rank within the visible slice. computeSliceReorder keeps the slot
  // set of the visible 3 and re-assigns it in the new order → out-of-view sprint
  // positions stay untouched. Optimistic local apply, then PATCH /api/sprints/reorder.
  const handleSprintReorder = (fromId, toId) => {
    if (!projectId) return
    const payload = computeSliceReorder(next3Sprints, fromId, toId)
    if (!payload) return
    setSprints(prev => applyReorder(prev, payload))
    fetch('/api/sprints/reorder', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': String(projectId),
      },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) {
          console.error('[DD-489] sprint reorder failed:', res.status)
          loadSprints() // resync from server on failure
          return null
        }
        return res.json()
      })
      .then(data => {
        // Server returns the authoritative project-scoped sprint list.
        if (data && Array.isArray(data.sprints)) setSprints(data.sprints)
      })
      .catch(err => {
        console.error('[DD-489] sprint reorder error:', err)
        loadSprints()
      })
  }

  // DD-489 — wire SprintFormModal create: POST /api/sprints, then close + refresh.
  const handleSprintSubmit = ({ values }) => {
    if (!projectId) return
    setSprintSubmitting(true)
    setSprintError('')
    fetch('/api/sprints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': String(projectId),
      },
      body: JSON.stringify(values),
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Sprint-Erstellung fehlgeschlagen (${res.status})`)
        }
        return res.json()
      })
      .then(() => loadSprints())
      .then(() => { setSprintModal(false) })
      .catch(err => {
        console.error('[DD-489] sprint create error:', err)
        setSprintError(err.message || 'Sprint konnte nicht erstellt werden.')
      })
      .finally(() => setSprintSubmitting(false))
  }

  // ── Grid layout ──────────────────────────────────────────────────────────────
  // OverviewTab manages its own 2-col inner grid (main + aside) because
  // ProjectHomeView passes sidebar={null} for the overview tab, so there is no
  // outer ProjectHomeLayout aside for us.  The aside collapses exactly like the
  // outer layout: 340px ↔ 48px driven by sidebarCollapsed.
  // DD-540: the 48px-collapse + fixed 2-col grid is a DESKTOP affordance. Below lg
  // (<1024) the aside stacks under the main panel and always shows its content, so
  // the project meta is visible on mobile (was squeezed/clipped before). Default
  // true → SSR/snapshot renders as desktop, keeping the existing contract stable.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)
  const collapsed = isDesktop && sidebarCollapsed
  const asideCols = collapsed ? '48px' : '340px'

  return (
    <div
      role="tabpanel"
      id="tabpanel-overview"
      aria-labelledby="tab-overview"
      data-ui="project-home.tabs.overview"
      className="flex h-full flex-col overflow-y-auto lg:overflow-hidden"
    >
      {/* Inner responsive grid: [main 1fr] [aside 340|48px] */}
      <div
        data-ui={`${SCOPE}.overview-grid`}
        ref={(el) => {
          if (el) el.style.setProperty('--ov-aside', asideCols)
        }}
        className="grid grid-cols-1 gap-[var(--space-4,16px)] lg:h-full lg:min-h-0 lg:[grid-template-columns:minmax(0,1fr)_var(--ov-aside,340px)] lg:[transition:grid-template-columns_0.2s_ease]"
      >
        {/* ── Main panel (2-col: LEFT Summary+Vision | RIGHT Todos) ──────── */}
        <div
          data-ui={`${SCOPE}.panel`}
          className="grid grid-cols-1 gap-[var(--space-4,16px)] md:grid-cols-2 w-full min-w-0 md:[grid-template-rows:minmax(0,1fr)] lg:h-full lg:min-h-0 lg:overflow-y-auto"
        >
          {/* LEFT: Summary + VisionGoals */}
          <Stack gap="md" className="h-full">
            <Card tone="mantle" data-ui={`${SCOPE}.summary`}>
              <CardHead
                title="Project Summary"
                actions={
                  <IconButton
                    size="sm"
                    variant="default"
                    icon={<Copy size={14} aria-hidden="true" />}
                    label="Projektkontext für KI-Übergabe kopieren"
                    onClick={copySummaryContext}
                    data-ui={`${SCOPE}.summary.copy`}
                  />
                }
              />
              <Stack gap="sm">
                <SummaryBox
                  anchor="achieved"
                  label="Was wurde erreicht"
                  editLabel="Was wurde erreicht bearbeiten"
                  text={achieved || 'Noch keine Einträge.'}
                  onEdit={() =>
                    openEdit({
                      key: 'achieved',
                      title: 'Was wurde erreicht',
                      label: 'Was wurde erreicht',
                      value: achieved,
                    })
                  }
                />
                <SummaryBox
                  anchor="next"
                  label="Nächste Schritte"
                  editLabel="Nächste Schritte bearbeiten"
                  text={next || 'Noch keine Einträge.'}
                  onEdit={() =>
                    openEdit({
                      key: 'next',
                      title: 'Nächste Schritte',
                      label: 'Nächste Schritte',
                      value: next,
                    })
                  }
                />
              </Stack>
            </Card>

            <VisionGoalsCard
              vision={vision}
              goals={goals}
              onEditVision={() =>
                openEdit({
                  key: 'vision',
                  title: 'Vision bearbeiten',
                  label: 'Vision',
                  value: vision,
                })
              }
              onEditGoals={() =>
                openEdit({
                  key: 'goals',
                  title: 'Goals bearbeiten',
                  label: 'Goals (eine Zeile pro Goal)',
                  value: goals.join('\n'),
                })
              }
              dataUiScope={`${SCOPE}.vision-goals`}
            />
          </Stack>

          {/* RIGHT: Todos column */}
          <div
            data-ui={`${SCOPE}.todos`}
            className="flex flex-col gap-[var(--space-3,12px)] h-full min-h-0"
          >
            <ChecklistInputForm
              variant="todo"
              onCreate={create}
              onOpenFull={() => setTodoDetail({ open: true, todo: NEW_TODO })}
              disabled={!projectId || todosLoading}
              dataUiScope={`${SCOPE}.todos.input`}
            />

            <div
              data-ui={`${SCOPE}.todos.controls`}
              className="flex items-center gap-[var(--space-2,8px)] flex-wrap"
            >
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--subtext0)] pointer-events-none"
                />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ToDos durchsuchen…"
                  aria-label="ToDos durchsuchen"
                  data-ui={`${SCOPE}.todos.search`}
                  className="pl-8"
                />
              </div>
              <SegmentedControl
                data-ui={`${SCOPE}.todos.filter`}
                value={showAll}
                onChange={setShowAll}
                options={[
                  { value: false, label: 'Aktuell' },
                  { value: true, label: 'Alle' },
                ]}
              />
            </div>

            {todosError && (
              <p
                className="text-sm text-[var(--red)] m-0"
                role="alert"
                data-ui={`${SCOPE}.todos.error`}
              >
                Fehler beim Laden der Todos.
              </p>
            )}

            <ProjectTodoList
              data-ui={`${SCOPE}.todos.list`}
              todos={visibleTodos}
              reorderable={false}
              onReorder={reorder}
              onToggleDone={handleToggleDone}
              onDelete={handleDelete}
              onOpenDetail={(t) => setTodoDetail({ open: true, todo: t })}
              onOpenIssue={handleOpenIssue}
            />

            {/* DD-492: kopierbare devd-cli-todo-Referenz (Power-User-Convenience) */}
            <TodoCliHelp dataUiScope={`${SCOPE}.todos.cli`} />
          </div>
        </div>

        {/* ── Collapsible aside: Meta + Milestone + Sprints ────────────────── */}
        <aside
          data-ui={`${SCOPE}.sidebar`}
          className="lg:h-full lg:overflow-y-auto"
          aria-hidden={collapsed ? 'true' : undefined}
        >
          {!collapsed && (
            <Stack gap="md" className="h-full">
              {project && (
                <ProjectMetaCard
                  project={project}
                  onCopyForAi={copyMeta}
                  dataUiScope={`${SCOPE}.meta`}
                />
              )}
              <CurrentMilestoneCard
                predecessor={milestoneSeq.predecessor}
                active={milestoneSeq.active}
                successor={milestoneSeq.successor}
                onAdd={() => setMilestoneModal(true)}
                onSelectPredecessor={() =>
                  milestoneSeq.predecessor?.id &&
                  navigate(`/milestones/${milestoneSeq.predecessor.id}`)
                }
                onSelectActive={() =>
                  milestoneSeq.active?.id &&
                  navigate(`/milestones/${milestoneSeq.active.id}`)
                }
                onSelectSuccessor={() =>
                  milestoneSeq.successor?.id &&
                  navigate(`/milestones/${milestoneSeq.successor.id}`)
                }
                dataUiScope={`${SCOPE}.milestone`}
              />
              <Next3SprintsCard
                sprints={next3Sprints}
                onAdd={() => { setSprintError(''); setSprintModal(true) }}
                onSelect={(id) => navigate(`/sprints/${id}`)}
                onReorder={handleSprintReorder}
                reorderable
                dataUiScope={`${SCOPE}.sprints`}
                className="flex-1"
              />
            </Stack>
          )}
        </aside>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <TextEditModal
        open={!!edit}
        title={edit?.title ?? ''}
        label={edit?.label ?? ''}
        value={edit?.value ?? ''}
        onSave={handleSave}
        onClose={closeEdit}
        dataUiScope={`${SCOPE}.edit-modal`}
      />

      <ChecklistDetailModal
        open={todoDetail.open}
        todo={todoDetail.todo}
        onClose={() => setTodoDetail({ open: false, todo: null })}
        onPatch={patch}
        onAddLink={addLink}
        onRemoveLink={removeLink}
        onOpenIssue={handleOpenIssue}
        dataUiScope={`${SCOPE}.todo-detail-modal`}
      />

      <MilestoneCreateModal
        open={milestoneModal}
        onClose={() => setMilestoneModal(false)}
        onCreate={() => setMilestoneModal(false)}
        dataUiScope={`${SCOPE}.milestone-modal`}
      />

      <SprintFormModal
        open={sprintModal}
        milestones={milestones}
        submitting={sprintSubmitting}
        error={sprintError}
        onClose={() => setSprintModal(false)}
        onSubmit={handleSprintSubmit}
        dataUiScope={`${SCOPE}.sprint-modal`}
      />
    </div>
  )
}
