/**
 * Globaler Project-Store. Ein-Process-Singleton, persistiert via localStorage.
 * Listener werden bei activeProjectId-Wechsel benachrichtigt → Views fetchen neu.
 */

const STORAGE_KEY = 'devd-active-project-id'

let _activeProjectId = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    const n = v ? Number(v) : 1
    return Number.isFinite(n) && n > 0 ? n : 1
  } catch {
    return 1
  }
})()

// DD-368: Aktiver Projekt-Slug. Persistiert separat, dient als Fallback für
// die Root-/Legacy-Redirects (D06/D07) — die URL bleibt während der Navigation
// die Wahrheitsquelle (ProjectScope setzt beides synchron aus dem URL-Slug).
const SLUG_STORAGE_KEY = 'devd-active-project-slug'

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

// DD-268 — Default-Projekt für den Issue-Catcher.
// Separater Key vom AppShell-Active-Project, weil Catcher als eigene PWA-Origin
// (issues.familie-riedel.org) eigenen Scope hat (Same-Origin-Policy).
const CAPTURE_DEFAULT_KEY = 'capture-default-project-id'

export function getCaptureDefaultProjectId() {
  try {
    const v = localStorage.getItem(CAPTURE_DEFAULT_KEY)
    if (v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function setCaptureDefaultProjectId(id) {
  try {
    if (id === null || id === undefined || id === '') {
      localStorage.removeItem(CAPTURE_DEFAULT_KEY)
      return
    }
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return
    localStorage.setItem(CAPTURE_DEFAULT_KEY, String(n))
  } catch {
    // localStorage nicht verfügbar / Quota / Safari Private — leise ignorieren.
  }
}
