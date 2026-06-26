import { getActiveProjectId } from './projectStore.js'

/**
 * Patcht globalen fetch so, dass /api/-Requests automatisch den X-Project-Id
 * Header tragen. Damit müssen bestehende fetch-Aufrufe nicht refactored werden.
 *
 * Idempotent: zweifache Initialisierung wird ignoriert (z.B. bei HMR).
 *
 * MVP-Boot (DD2 AppShell): authGuard/Authelia-Overlay (DD-537) ist bewusst
 * weggelassen — kein authGuard.js-Import, sonst kaskadiert die Authelia-Infra
 * mit herein. Folge-Task lift den Overlay-Pfad nach.
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

      // DD-620/DD-622: List-Endpoints liefern per Default nur Compact-Felder
      // (Token-Schutz für MCP/CLI). Das Browser-UI braucht die Vollobjekte →
      // fields=full zentral an GET-/api/-Requests anhängen, sofern nicht gesetzt.
      const method = String(init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase()
      if (method === 'GET' && !/[?&]fields=/.test(url)) {
        url = url + (url.includes('?') ? '&' : '?') + 'fields=full'
        if (typeof input === 'string') input = url
        else input = new Request(url, input)
      }
    }

    return origFetch(input, init)
  }
}
