/**
 * useElementBrowser — Connected-Orchestrierung des ElementBrowser-Screens (T03).
 *
 * Hält den gesamten Screen-State (Selektion, Suche, Sort) und fährt die echten
 * Roundtrips über `src/lib/elementsApi`. Der Screen selbst bleibt presentational:
 * dieser Hook reicht ihm fertige Props + Callbacks rein. So ist die Verdrahtung
 * in die Prod-App ein dünner Wrapper (`<ElementBrowserScreen {...useElementBrowser()} />`).
 *
 * Suche ist server-seitig (re-fetch bei `query`-Änderung, GET /api/backlog?search=).
 * Bulk-Aktionen schreiben (PATCH /api/backlog/bulk) und re-fetchen danach.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchIssues, fetchSprints, bulkUpdateIssues, mapIssueRow, mapSprintRow,
} from '../lib/elementsApi.js'

export function useElementBrowser({ projectId = 1 } = {}) {
  const [rawIssues, setRawIssues] = useState([])
  const [rawSprints, setRawSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [selectedIds, setSelectedIds] = useState([])
  const [expandedIds, setExpandedIds] = useState([])
  const [preview, setPreview] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('priority')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchIssues({ projectId, search: query }),
      fetchSprints({ projectId }),
    ])
      .then(([issues, sprints]) => {
        if (cancelled) return
        setRawIssues(issues)
        setRawSprints(sprints)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId, query, reloadKey])

  const items = useMemo(() => rawIssues.map(mapIssueRow), [rawIssues])
  const sprintOptions = useMemo(
    () => rawSprints.map((s) => ({ key: String(s.id), label: mapSprintRow(s).entityId + ' ' + s.name })),
    [rawSprints],
  )

  const onToggleSelect = useCallback((id) => {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }, [])

  // Shift+Pfeil aus der Liste liefert die fertige Range → ersetzt die Selektion.
  const onSelectRange = useCallback((ids) => setSelectedIds(ids), [])

  const onClearSelection = useCallback(() => setSelectedIds([]), [])

  const onToggleExpand = useCallback((id) => {
    setExpandedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }, [])

  // Enter/Klick öffnet die Preview; Esc schließt sie (Screen meldet onClosePreview).
  const onOpenItem = useCallback((item) => {
    if (!item) return
    const raw = rawIssues.find((r) => String(r.id) === item.id)
    setPreview({ type: item.kind || 'issue', data: { id: item.id, detail: raw }, size: 'default' })
  }, [rawIssues])

  const onClosePreview = useCallback(() => setPreview(null), [])

  // BulkActionBar.onAction(action, value) → action ∈ status|priority|sprint|delete.
  // value (Status-Key / Prio-Zahl / Sprint-id) → action-spezifisches Payload.
  const onBulkAction = useCallback(async (action, value) => {
    if (selectedIds.length === 0) return
    const payload =
      action === 'status' ? { status: value }
      : action === 'priority' ? { priority: value }
      : action === 'sprint' ? { sprint_id: value === '__backlog' ? null : Number(value) }
      : {}
    // presentational-id (String) → echte numerische Backlog-id rückübersetzen.
    const apiIds = selectedIds
      .map((sid) => rawIssues.find((r) => String(r.id) === sid)?.id)
      .filter((x) => x != null)
    await bulkUpdateIssues({ projectId, ids: apiIds, action, payload })
    setSelectedIds([])
    setReloadKey((k) => k + 1)
  }, [selectedIds, rawIssues, projectId])

  // Sprint-Optionen fürs Bulk-Menü (echte Sprints + „Aus Sprint nehmen").
  const bulkOptions = useMemo(
    () => ({ sprints: [...sprintOptions, { key: '__backlog', label: 'Aus Sprint nehmen (Backlog)' }] }),
    [sprintOptions],
  )

  return {
    items, sprintOptions, bulkOptions, loading, error,
    selectedIds, onToggleSelect, onSelectRange, onClearSelection,
    expandedIds, onToggleExpand,
    preview, onOpenItem, onClosePreview,
    query, onQueryChange: setQuery,
    sort, onSortChange: setSort,
    onBulkAction,
  }
}
