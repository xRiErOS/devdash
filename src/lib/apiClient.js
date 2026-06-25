import { getActiveProjectId } from './projectStore'
import { isAuthGatedHost, isAuthFailureResponse, notifyAuthRequired } from './authGuard.js'

/**
 * Patcht globalen fetch so, dass /api/-Requests automatisch den X-Project-Id
 * Header tragen. Damit müssen bestehende fetch-Aufrufe nicht refactored werden.
 *
 * Idempotent: zweifache Initialisierung wird ignoriert (z.B. bei HMR).
 */
export function installApiClient() {
  if (typeof window === 'undefined') return
  if (window.__devdApiClientInstalled) return
  window.__devdApiClientInstalled = true

  const origFetch = window.fetch.bind(window)

  window.fetch = (input, init = {}) => {
    let url = typeof input === 'string' ? input : input?.url
    const isApi = typeof url === 'string' && url.startsWith('/api/')
    if (isApi) {
      const headers = new Headers(init.headers || {})
      headers.set('X-Project-Id', String(getActiveProjectId()))
      init = { ...init, headers }

      // DD-620/DD-622: Die List-Endpoints liefern per Default nur Compact-Felder
      // (Token-Schutz für MCP/CLI-Agenten). Das Browser-UI braucht die Vollobjekte
      // (goal/notes/background …) → fields=full zentral an GET-/api/-Requests anhängen,
      // sofern nicht explizit gesetzt. Ein Chokepoint statt ~20 Call-Sites zu migrieren.
      const method = String(init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase()
      if (method === 'GET' && !/[?&]fields=/.test(url)) {
        url = url + (url.includes('?') ? '&' : '?') + 'fields=full'
        if (typeof input === 'string') input = url
        else input = new Request(url, input)
      }
    }

    const res = origFetch(input, init)
    // DD-537: Auth-Fehler (abgelaufene Authelia-Session) zentral erkennen — nur
    // fuer /api-Requests auf auth-gegateten Hosts. notifyAuthRequired() ist
    // idempotent (Event feuert einmal) → AuthExpiredOverlay uebernimmt.
    if (!isApi || !isAuthGatedHost()) return res
    return res
      .then((response) => {
        if (isAuthFailureResponse(response)) notifyAuthRequired()
        return response
      })
      .catch((err) => {
        // Cross-Origin-Redirect auf die Authelia-Login-Domain kann den fetch als
        // TypeError (CORS-blockiert) werfen. Abbrueche (AbortError) ausnehmen,
        // damit Navigations-Abbrueche keine falsche Session-Meldung ausloesen.
        if (err && err.name === 'TypeError') notifyAuthRequired()
        throw err
      })
  }
}
