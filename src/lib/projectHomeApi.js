// DD-283 (M3-S02 T03): Frontend-Client für Project-Home ToDo-CRUD + Links.
// apiClient (siehe src/lib/apiClient.js) injiziert X-Project-Id-Header — wir
// nehmen die ID hier explizit in den URL-Pfad, da REST-Routes /api/projects/:id/...
// auf eindeutige Projekt-Scope ausgelegt sind.

const BASE = '/api/projects'

async function _request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  let data = null
  let parseError = null
  try { data = await res.json() } catch (e) { parseError = e }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.code = data?.code
    err.field = data?.field
    err.status = res.status
    throw err
  }
  // I11-Fix: ok-Response mit Parse-Error darf nicht als Erfolg mit data=null
  // durchgereicht werden. Caller würde undefined lesen und still failen.
  if (parseError) {
    const err = new Error('Server lieferte fehlerhaftes JSON: ' + parseError.message)
    err.code = 'MALFORMED_JSON'
    err.status = res.status
    throw err
  }
  return data
}

export function listTodos(projectId) {
  return _request('GET', `${BASE}/${projectId}/todos`)
}

export function createTodo(projectId, body) {
  return _request('POST', `${BASE}/${projectId}/todos`, body)
}

export function patchTodo(projectId, todoId, body) {
  return _request('PATCH', `${BASE}/${projectId}/todos/${todoId}`, body)
}

export function deleteTodo(projectId, todoId) {
  return _request('DELETE', `${BASE}/${projectId}/todos/${todoId}`)
}

export function reorderTodos(projectId, order) {
  return _request('PATCH', `${BASE}/${projectId}/todos/reorder`, { order })
}

export function addTodoLink(projectId, todoId, body) {
  return _request('POST', `${BASE}/${projectId}/todos/${todoId}/links`, body)
}

export function removeTodoLink(projectId, todoId, linkId) {
  return _request('DELETE', `${BASE}/${projectId}/todos/${todoId}/links/${linkId}`)
}

// DD-345 (DD#47): SSTD-Content (unabhängig von docs_path/Whitelist). 404 → leer.
// Entkoppelt vom Sources-Panel, damit ein Sources-/Whitelist-Fehler (z.B. docs_path
// außerhalb Whitelist auf der NAS) das Rendern der SSTD nicht blockiert (R2-Fix).
export async function getSstd(projectId) {
  const res = await fetch(`${BASE}/${projectId}/sstd`)
  if (res.status === 404) return { sstd_content: null, sstd_updated_at: null }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// DD-345 (DD#47): Sources-Panel über DD-281-API. Liefert { project, vault: [...] }.
// Kann mit PATH_OUTSIDE_WHITELIST (400) fehlschlagen — Caller behandelt das tolerant.
export function getSstdSources(projectId) {
  return _request('GET', `${BASE}/${projectId}/sstd-sources`)
}

// DD-361: SSTD-Slot-Editor. Die 6 Slots einzeln laden/speichern (Whole-Slot, last-write-wins
// gegen die MEM#6-Slot-REST) plus die beiden read-only Projektionen (Nächste Schritte, Journal).
export function getSstdSlots(projectId) {
  return _request('GET', `${BASE}/${projectId}/sstd/slots`)
}

export function setSstdSlot(projectId, slotKey, content) {
  return _request('PUT', `${BASE}/${projectId}/sstd/slots/${slotKey}`, { content })
}

export function getSstdProjections(projectId) {
  return _request('GET', `${BASE}/${projectId}/sstd/projections`)
}

export const LINK_TYPES = Object.freeze(['spec', 'issue', 'vault', 'url'])
export const TODO_STATUSES = Object.freeze(['open', 'done', 'cancelled'])
