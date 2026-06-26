/**
 * Globaler Project-Store. Ein-Process-Singleton, persistiert via localStorage.
 * Listener werden bei activeProjectId-Wechsel benachrichtigt → Views fetchen neu.
 *
 * Wahrheitsquelle bleibt während der Navigation die URL (ProjectScope setzt
 * ID + Slug synchron aus dem :slug-Param). Der Store ist nur der Lese-Zugriff
 * für apiClient (X-Project-Id) und useProjectNav (Slug-Prefix).
 */

const STORAGE_KEY = 'devd-active-project-id'
const SLUG_STORAGE_KEY = 'devd-active-project-slug'

function readNum(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    const n = v ? Number(v) : fallback
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

let _activeProjectId = readNum(STORAGE_KEY, 1)

let _activeSlug = (() => {
  try {
    const v = localStorage.getItem(SLUG_STORAGE_KEY)
    return v && /^[a-z0-9-]+$/i.test(v) ? v : null
  } catch {
    return null
  }
})()

const listeners = new Set()

export function getActiveProjectId() {
  return _activeProjectId
}

export function getActiveSlug() {
  return _activeSlug
}

export function setActiveSlug(slug) {
  const s = typeof slug === 'string' && slug ? slug : null
  if (s === _activeSlug) return
  _activeSlug = s
  try {
    if (s) localStorage.setItem(SLUG_STORAGE_KEY, s)
    else localStorage.removeItem(SLUG_STORAGE_KEY)
  } catch {}
}

export function setActiveProjectId(id) {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return
  if (n === _activeProjectId) return
  _activeProjectId = n
  try {
    localStorage.setItem(STORAGE_KEY, String(n))
  } catch {}
  for (const fn of listeners) fn(n)
}

export function subscribeProject(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
