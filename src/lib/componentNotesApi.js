// DD-273 (M3-S02 T01): Frontend-Client für component-notes API.
// apiClient injiziert X-Project-Id-Header automatisch.

import { getActiveProjectId } from './projectStore.js'

const BASE = '/api/projects'

async function _fetch(method, path, body) {
  const projectId = getActiveProjectId()
  const res = await fetch(`${BASE}/${projectId}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = res.status === 404 ? null : await res.json().catch(() => null)
  if (!res.ok && res.status !== 404) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.code = data?.code
    err.status = res.status
    throw err
  }
  return data
}

export function listComponentNotes() {
  return _fetch('GET', '/component-notes')
}

export function getComponentNote(slug) {
  return _fetch('GET', `/component-notes/${encodeURIComponent(slug)}`)
}

export function upsertComponentNote(slug, content) {
  return _fetch('PUT', `/component-notes/${encodeURIComponent(slug)}`, { content })
}

export function deleteComponentNote(slug) {
  return _fetch('DELETE', `/component-notes/${encodeURIComponent(slug)}`)
}
