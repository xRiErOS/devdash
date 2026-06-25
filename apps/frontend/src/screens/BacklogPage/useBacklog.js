// GF-2 /dd-screen T03 — Container-Hook für BacklogScreen (R6: State/Daten/Router
// hier, nicht in den Design-System-Komponenten). Lädt /api/backlog + /api/sprints
// + /api/milestones, hält URL-State (useSearchParams), modelliert die 4 States und
// feuert je Backend-Action einen success/error-Toast. Payloads aus payloads.js
// (gegen den geteilten Zod-Contract getestet). Status-Transition NUR über
// patchIssueStatus → /api/backlog/:id/status (lifecycle), nie direkt.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { toast } from '../../lib/toast.js'
import { patchIssueStatus } from '../../lib/issueStatusApi.js'
import { sprintLabel } from '../../lib/sprintLabel.js'
import { displayId } from '../../lib/displayId.js'
import { getActiveProjectId, getActiveSlug, subscribeProject } from '../../lib/projectStore.js'
import {
  buildCreatePayload,
  buildAssignSprintPayload,
  buildFieldUpdatePayload,
  buildBulkPayload,
} from './payloads.js'
import { stepId, indexOfId, resolveActiveId } from './listNav.js'
import { saveIssueRequest } from './saveIssue.js'

const DEFAULT_STATUSES = ['new', 'refined']

async function postJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json().catch(() => null)
}

export function useBacklog() {
  const [params, setParams] = useSearchParams()
  const routeParams = useParams()
  const projectSlug = routeParams.slug || getActiveSlug()
  const [items, setItems] = useState([])
  const [sprints, setSprints] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkSprintId, setBulkSprintId] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [projectId, setProjectId] = useState(getActiveProjectId())
  // Voll-Detail-Laden: bei Auswahl das angereicherte Issue nachladen.
  const [detailIssue, setDetailIssue] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [savingIssue, setSavingIssue] = useState(false)
  const [saveIssueError, setSaveIssueError] = useState('')

  // URL-State.
  const search = params.get('q') || ''
  const statusFilters = (params.get('status') || DEFAULT_STATUSES.join(',')).split(',').filter(Boolean)
  const typeFilter = params.get('type') || ''
  const sortOrder = params.get('sort') || 'key'
  const showCancelled = params.get('cancelled') === '1'

  const patchParam = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value == null || value === '') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }, [setParams])

  useEffect(() => subscribeProject(() => setProjectId(getActiveProjectId())), [])

  // Laden (Liste + Sprints). search server-seitig; Filter/Sort client-seitig.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)
    const url = search ? `/api/backlog?search=${encodeURIComponent(search)}` : '/api/backlog'
    Promise.all([
      fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/sprints').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([b, s]) => {
        if (cancelled) return
        const list = Array.isArray(b) ? b : []
        setItems(list)
        setSprints(Array.isArray(s) ? s : [])
        setStatus(list.length === 0 ? 'empty' : 'populated')
      })
      .catch(() => {
        if (cancelled) return
        setError('Backlog konnte nicht geladen werden.')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [search, projectId, reload])

  // Externe Mutationen (andere Tabs/Aktionen) → neu laden.
  useEffect(() => {
    const onChange = () => setReload((c) => c + 1)
    window.addEventListener('devd-backlog-changed', onChange)
    return () => window.removeEventListener('devd-backlog-changed', onChange)
  }, [])

  // Voll-Detail-Laden: bei Auswahl-Wechsel das angereicherte Issue via
  // GET /api/backlog/:id nachladen (trägt Reviews/Deps/Aktivität/Anhänge/Memories).
  useEffect(() => {
    if (!activeId) { setDetailIssue(null); return }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/backlog/${activeId}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data) => { if (!cancelled) { setDetailIssue(data); setDetailLoading(false) } })
      .catch(() => { if (!cancelled) { setDetailIssue(null); setDetailLoading(false) } })
    return () => { cancelled = true }
  }, [activeId, reload])

  // Client-seitige Filterung/Sortierung.
  const filtered = useMemo(() => {
    let out = items.filter((b) => {
      if (!showCancelled && b.status === 'cancelled') return false
      if (statusFilters.length && !statusFilters.includes(b.status) && !(showCancelled && b.status === 'cancelled')) return false
      if (typeFilter && b.type !== typeFilter) return false
      return true
    })
    const cmp = {
      key: (a, b) => (a.project_number ?? 0) - (b.project_number ?? 0),
      priority: (a, b) => (a.priority ?? 9) - (b.priority ?? 9),
      created: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
    }[sortOrder] || (() => 0)
    return [...out].sort(cmp)
  }, [items, statusFilters, typeFilter, showCancelled, sortOrder])

  // Auto-Select (PO 2026-06-24): immer ein Issue gewählt — beim Laden das erste,
  // nach Projektwechsel/Filter-Ausschluss erneut das erste, gültige Auswahl bleibt.
  // Funktionales setState + dep [filtered] → kein activeId-Loop.
  useEffect(() => {
    setActiveId((cur) => resolveActiveId(filtered, cur))
  }, [filtered])

  const activeIssue = useMemo(() => items.find((b) => b.id === activeId) || null, [items, activeId])

  // T04 (DD-Review): Stepper-Position + Vor/Zurück durch die gefilterte Liste.
  // Klick (DetailPager) und Tastatur (ArrowUp/Down) teilen sich stepId/listNav.
  const pagerIndex = useMemo(() => indexOfId(filtered, activeId), [filtered, activeId])
  const onPrevIssue = useCallback(() => setActiveId(stepId(filtered, activeId, 'prev')), [filtered, activeId])
  const onNextIssue = useCallback(() => setActiveId(stepId(filtered, activeId, 'next')), [filtered, activeId])

  // ArrowUp/Down bewegen die Auswahl durch die Liste (und öffnen sie im Pane).
  // Nicht hijacken, wenn in einem Eingabe-/Auswahl-Control oder offenen Overlay
  // (Popover/Select-Listbox) getippt wird, und nicht mit Modifier.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      if (t?.closest?.('[role="dialog"],[role="listbox"]')) return
      if (!filtered.length) return
      e.preventDefault()
      setActiveId(stepId(filtered, activeId, e.key === 'ArrowDown' ? 'next' : 'prev'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, activeId])

  const sprintOptions = useMemo(
    () => sprints.map((s) => ({ value: String(s.id), label: sprintLabel(s) })),
    [sprints],
  )
  const milestoneOptions = useMemo(() => {
    const names = new Set()
    for (const b of items) if (b.milestone) names.add(String(b.milestone))
    if (activeIssue?.milestone) names.add(String(activeIssue.milestone))
    return [{ value: '', label: '—' }, ...[...names].sort().map((n) => ({ value: n, label: n }))]
  }, [items, activeIssue])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (statusFilters.join(',') !== DEFAULT_STATUSES.join(',')) n += 1
    if (typeFilter) n += 1
    if (sortOrder !== 'key') n += 1
    if (showCancelled) n += 1
    return n
  }, [statusFilters, typeFilter, sortOrder, showCancelled])

  // ── Actions (je Backend-Effekt success/error-Toast) ───────────────────────
  const reloadSoon = useCallback(() => setReload((c) => c + 1), [])

  const onChangeField = useCallback(async (field, value, successMsg) => {
    if (!activeId) return
    try {
      await postJson(`/api/backlog/${activeId}`, 'PUT', buildFieldUpdatePayload(field, value))
      toast(successMsg, 'success')
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Speichern fehlgeschlagen', 'error')
    }
  }, [activeId, reloadSoon])

  const onChangeSprint = useCallback(async (value) => {
    if (!activeId) return
    try {
      await postJson(`/api/backlog/${activeId}/sprint`, 'PATCH', buildAssignSprintPayload(value))
      toast('Sprint zugewiesen', 'success')
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Sprint-Zuweisung fehlgeschlagen', 'error')
    }
  }, [activeId, reloadSoon])

  const onTransition = useCallback(async (next, notes) => {
    if (!activeId) return
    try {
      await patchIssueStatus(activeId, next, notes)
      toast('Status geändert', 'success')
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Statuswechsel fehlgeschlagen', 'error')
    }
  }, [activeId, reloadSoon])

  const onRequestNotes = useCallback((next) => {
    if (next === 'cancelled') return window.prompt('Grund für Stornierung?') || null
    return null
  }, [])

  // Hard-Delete (DELETE /api/backlog/:id?force=1; Bestätigung trägt BacklogDetails
  // via DeleteConfirmModal). Storniert ≠ Löschen: Löschen entfernt den Datensatz.
  const onDelete = useCallback(async (issue) => {
    const id = issue?.id ?? activeId
    if (!id) return
    setDeleteBusy(true)
    try {
      await postJson(`/api/backlog/${id}?force=1`, 'DELETE')
      toast('Issue gelöscht', 'success')
      if (id === activeId) setActiveId(null)
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Löschen fehlgeschlagen', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }, [activeId, reloadSoon])

  const onCreate = useCallback(async (issue) => {
    try {
      await postJson('/api/backlog', 'POST', buildCreatePayload(issue))
      toast('Issue angelegt', 'success')
      reloadSoon()
      return true
    } catch (e) {
      toast(e.message || 'Anlegen fehlgeschlagen', 'error')
      return false
    }
  }, [reloadSoon])

  // onSaveIssue: aus IssueForm.onSubmit({ mode:'edit', issueId, values }).
  // Orchestrierung (PUT-Felder → bedingter Sprint-PATCH, Partial-Failure-sicher)
  // liegt pure in saveIssueRequest (DI postJson, node-env-testbar). Hier nur das
  // Mapping der outcomes auf die UI-Seiteneffekte (Toast/Modal/reload/savingIssue).
  const onSaveIssue = useCallback(async ({ issueId, values }) => {
    const id = issueId ?? activeId
    if (!id) return
    setSavingIssue(true)
    setSaveIssueError('')

    const currentIssue = items.find((b) => b.id === id) || activeIssue
    const currentSprint = currentIssue?.assigned_sprint ?? null

    const result = await saveIssueRequest({ id, values, currentSprint, postJson })

    if (result.outcome === 'ok') {
      toast('Issue gespeichert', 'success')
      setEditOpen(false)
      reloadSoon()
    } else if (result.outcome === 'sprint_failed') {
      // Felder gespeichert → Pane refreshen, Modal offen für Sprint-Retry.
      setSaveIssueError(result.message)
      toast(result.message, 'error')
      reloadSoon()
    } else {
      // update_failed → Modal offen, KEIN reload.
      setSaveIssueError(result.message)
      toast(result.message, 'error')
    }
    setSavingIssue(false)
  }, [activeId, activeIssue, items, reloadSoon])

  const onBulkCancel = useCallback(async () => {
    if (!selectedIds.length) return
    const notes = window.prompt('Grund für Stornierung der Auswahl?') || undefined
    try {
      await postJson('/api/backlog/bulk', 'PATCH', buildBulkPayload(selectedIds, 'cancel', notes ? { notes } : undefined))
      toast(`${selectedIds.length} Issues storniert`, 'success')
      setSelectedIds([])
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Bulk-Stornierung fehlgeschlagen', 'error')
    }
  }, [selectedIds, reloadSoon])

  const onBulkAssignSprint = useCallback(async () => {
    if (!selectedIds.length) return
    if (!bulkSprintId) { toast('Erst einen Ziel-Sprint wählen', 'error'); return }
    try {
      await postJson('/api/backlog/bulk', 'PATCH', buildBulkPayload(selectedIds, 'set_sprint', buildAssignSprintPayload(bulkSprintId)))
      toast(`${selectedIds.length} Issues zugewiesen`, 'success')
      setSelectedIds([])
      reloadSoon()
    } catch (e) {
      toast(e.message || 'Bulk-Zuweisung fehlgeschlagen', 'error')
    }
  }, [selectedIds, bulkSprintId, reloadSoon])

  const onExport = useCallback(() => {
    const fmt = 'md'
    const qs = new URLSearchParams({ format: fmt })
    if (statusFilters.length) qs.set('status', statusFilters.join(','))
    window.open(`/api/backlog-export?${qs.toString()}`, '_blank', 'noopener')
  }, [statusFilters])

  const toggleMulti = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const onOpenFull = useCallback((issue) => {
    const num = issue?.project_number ?? issue?.id
    window.location.assign(`/${getActiveProjectId() ? '' : ''}issues/${num}`.replace('//', '/'))
  }, [])

  const onCopyMeta = useCallback(() => {
    if (!activeIssue) return
    const meta = [
      `Key: ${displayId(activeIssue)}`, `Title: ${activeIssue.title}`,
      `Type: ${activeIssue.type}`, `Status: ${activeIssue.status}`, `Priority: P${activeIssue.priority}`,
    ].join('\n')
    navigator.clipboard?.writeText(meta).then(
      () => toast('Meta kopiert', 'success'),
      () => toast('Kopieren fehlgeschlagen', 'error'),
    )
  }, [activeIssue])

  return {
    status, error, projectSlug,
    items: filtered, sprintOptions, milestoneOptions,
    pagerIndex, pagerTotal: filtered.length, onPrevIssue, onNextIssue,
    statusFilters, typeFilter, sortOrder, showCancelled, activeFilterCount,
    search, activeId, activeIssue, selectedIds, bulkSprintId,
    // toolbar
    onSearch: (e) => patchParam('q', typeof e === 'string' ? e : e?.target?.value ?? ''),
    onClearSearch: () => patchParam('q', ''),
    onToggleStatusFilter: (s) => {
      const set = new Set(statusFilters)
      set.has(s) ? set.delete(s) : set.add(s)
      patchParam('status', [...set].join(','))
    },
    onChangeTypeFilter: (v) => patchParam('type', v),
    onChangeSort: (v) => patchParam('sort', v === 'key' ? '' : v),
    onToggleCancelled: () => patchParam('cancelled', showCancelled ? '' : '1'),
    onClearFilters: () => setParams({}, { replace: true }),
    onCreateClick: () => window.dispatchEvent(new CustomEvent('devd-backlog-create')),
    onExport,
    // list / detail
    onOpen: setActiveId,
    onToggleMulti: toggleMulti,
    onRowStatus: (item) => setActiveId(item.id),
    onClearSelection: () => setSelectedIds([]),
    onChangeBulkSprint: setBulkSprintId,
    onBulkAssignSprint, onBulkCancel,
    onChangeType: (v) => onChangeField('type', v, 'Typ geändert'),
    onChangePriority: (v) => onChangeField('priority', v, 'Priorität geändert'),
    onChangeMilestone: (v) => onChangeField('milestone', v, 'Milestone geändert'),
    onChangeSprint, onTransition, onRequestNotes, onDelete, deleteBusy, onCopyMeta, onOpenFull, onCreate,
    onRetry: reloadSoon,
    // Detail-Pane Voll-Daten + Edit-Flow
    detailIssue, detailLoading,
    editOpen, onOpenEdit: () => setEditOpen(true), onCloseEdit: () => { setEditOpen(false); setSaveIssueError('') },
    savingIssue, saveIssueError, onSaveIssue,
  }
}
