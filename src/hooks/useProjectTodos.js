// DD-283 (M3-S02 T03): useProjectTodos — fetch+mutate Hook mit Optimistic-Updates.
// Rollback bei Server-Error. Stellt die volle ToDo-Liste inkl. nested links bereit.

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  listTodos as apiList,
  createTodo as apiCreate,
  patchTodo as apiPatch,
  deleteTodo as apiDelete,
  reorderTodos as apiReorder,
  addTodoLink as apiAddLink,
  removeTodoLink as apiRemoveLink,
} from '../lib/projectHomeApi.js'

// DD-364: Cross-Instanz-Sync. Mehrere useProjectTodos-Instanzen (z.B. TodoTab +
// SettingsSidebar-Preview) teilen keinen State. Nach jeder server-bestätigten
// Mutation feuert ein CustomEvent (analog zu `devd-backlog-changed`), auf das
// alle Instanzen mit refresh() reagieren. Server = Source of Truth.
export const TODOS_CHANGED_EVENT = 'devd-todos-changed'

function dispatchTodosChanged(projectId) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TODOS_CHANGED_EVENT, { detail: { projectId } }))
  }
}

export function useProjectTodos(projectId) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const snapshotRef = useRef([])

  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const list = await apiList(projectId)
      setTodos(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e.message || 'Liste laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  // DD-364: Auf Cross-Instanz-Mutationen lauschen. refresh() dispatcht NICHT
  // selbst (kein Loop) — nur die Mutationen feuern. Self-trigger der mutierenden
  // Instanz ist akzeptabel (idempotenter Re-Fetch).
  useEffect(() => {
    if (!projectId) return undefined
    const onTodosChanged = (event) => {
      if (event.detail?.projectId === projectId) refresh()
    }
    window.addEventListener(TODOS_CHANGED_EVENT, onTodosChanged)
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, onTodosChanged)
  }, [projectId, refresh])

  // B06-Fix: snapshot ist mit `todos` als Dep memoized, damit zwischen
  // snapshot()-Call und await-Resolve kein stale Wert in snapshotRef landet.
  // rollback liest snapshotRef.current — die Memoisierung garantiert, dass
  // snapshot() den exact-render-State der ToDos zur Zeit des optimistic-Updates
  // captured, nicht einen versehentlichen Zwischenstand.
  const snapshot = useCallback(() => { snapshotRef.current = todos }, [todos])
  const rollback = useCallback((msg) => {
    setTodos(snapshotRef.current)
    setError(msg)
  }, [])

  const create = useCallback(async (label) => {
    if (!projectId) return null
    const trimmed = (label || '').trim()
    if (!trimmed) return null
    snapshot()
    const tempId = -Date.now()
    const optimistic = {
      id: tempId,
      project_id: projectId,
      label: trimmed,
      details: '',
      status: 'open',
      position: (todos.at(-1)?.position || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      links: [],
      _optimistic: true,
    }
    setTodos((prev) => [...prev, optimistic])
    try {
      const created = await apiCreate(projectId, { label: trimmed })
      setTodos((prev) => prev.map(t => (t.id === tempId ? { ...created, links: created.links || [] } : t)))
      dispatchTodosChanged(projectId)
      return created
    } catch (e) {
      rollback(e.message || 'Anlegen fehlgeschlagen')
      throw e
    }
  }, [projectId, todos, rollback, snapshot])

  const patch = useCallback(async (todoId, body) => {
    if (!projectId) return null
    snapshot()
    setTodos((prev) => prev.map(t => (t.id === todoId ? { ...t, ...body } : t)))
    try {
      const updated = await apiPatch(projectId, todoId, body)
      setTodos((prev) => prev.map(t => (t.id === todoId ? { ...t, ...updated, links: t.links } : t)))
      dispatchTodosChanged(projectId)
      return updated
    } catch (e) {
      rollback(e.message || 'Update fehlgeschlagen')
      throw e
    }
  }, [projectId, rollback, snapshot])

  const remove = useCallback(async (todoId) => {
    if (!projectId) return
    snapshot()
    setTodos((prev) => prev.filter(t => t.id !== todoId))
    try {
      await apiDelete(projectId, todoId)
      dispatchTodosChanged(projectId)
    } catch (e) {
      rollback(e.message || 'Löschen fehlgeschlagen')
      throw e
    }
  }, [projectId, rollback, snapshot])

  const reorder = useCallback(async (orderedIds) => {
    if (!projectId) return
    // B07-Fix: optimistic-Create-tempIds (negativ) niemals an Backend senden.
    // Backend würde ORDER_MISMATCH werfen. Stattdessen Reorder ignorieren bis
    // alle pending creates aufgelöst sind.
    if (orderedIds.some(id => typeof id !== 'number' || id <= 0)) {
      setError('Reorder verzögert: ToDo-Anlage noch nicht bestätigt. Bitte erneut versuchen.')
      return
    }
    snapshot()
    const byId = new Map(todos.map(t => [t.id, t]))
    const reordered = orderedIds.map((id, idx) => ({ ...byId.get(id), position: idx + 1 })).filter(Boolean)
    setTodos(reordered)
    try {
      await apiReorder(projectId, orderedIds)
      dispatchTodosChanged(projectId)
    } catch (e) {
      rollback(e.message || 'Reorder fehlgeschlagen')
      throw e
    }
  }, [projectId, todos, snapshot, rollback])

  const addLink = useCallback(async (todoId, body) => {
    if (!projectId) return null
    // B09-Doc: addLink ist NICHT optimistic — Link wird erst NACH Server-Response
    // in den State eingefügt. Kein Rollback nötig. Snapshot trotzdem für Konsistenz
    // mit anderen Mutations (Pattern), aber operativ ohne Effekt.
    snapshot()
    try {
      const link = await apiAddLink(projectId, todoId, body)
      setTodos((prev) => prev.map(t => (t.id === todoId ? { ...t, links: [...(t.links || []), link] } : t)))
      dispatchTodosChanged(projectId)
      return link
    } catch (e) {
      setError(e.message || 'Link hinzufügen fehlgeschlagen')
      throw e
    }
  }, [projectId, snapshot])

  const removeLink = useCallback(async (todoId, linkId) => {
    if (!projectId) return
    snapshot()
    setTodos((prev) => prev.map(t => (t.id === todoId ? { ...t, links: (t.links || []).filter(l => l.id !== linkId) } : t)))
    try {
      await apiRemoveLink(projectId, todoId, linkId)
      dispatchTodosChanged(projectId)
    } catch (e) {
      rollback(e.message || 'Link entfernen fehlgeschlagen')
      throw e
    }
  }, [projectId, rollback, snapshot])

  return {
    todos,
    loading,
    error,
    refresh,
    create,
    patch,
    remove,
    reorder,
    addLink,
    removeLink,
  }
}
