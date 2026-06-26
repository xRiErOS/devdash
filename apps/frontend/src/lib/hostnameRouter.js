// DD-248: Selbst-dokumentierende Hostname→View-Auflösung.
//
// Ziel: Explizite Whitelist statt impliziter Default-Branch im Code-Split-Boot.
// Jeder erlaubte Host wird einer benannten View zugewiesen ('app-shell' oder
// 'capture-view'). Unbekannte Hostnames landen NICHT still in einer Default-
// Branch, sondern werden als 'unknown' markiert — die Boot-Seite kann darauf
// einen Fallback (z.B. AppShell + Banner) anzeigen.
//
// Pure Funktion ohne window-Zugriff — vitest-testbar (tests/appshell-hostname-router).
//
// Quellen für eine "View-Zuweisung" (in dieser Reihenfolge ausgewertet):
//   1. URL-Query ?capture=1            → 'capture-view' (Debug / forced override)
//   2. Pfad /catch/<slug> (DD-269/456) → 'capture-view-pinned' (nur bekannte Hosts)
//   3. Pfad /capture (DD-456)          → 'capture-view' (nur bekannte Hosts)
//   4. Exact-Match Whitelist           → 'app-shell' oder 'capture-view'
//   5. Pattern-Match Whitelist (Tailnet) → 'app-shell'
//   6. Sonst                           → 'unknown' (Boot zeigt Fallback + Banner)

export const VIEW_APP_SHELL = 'app-shell'
export const VIEW_CAPTURE = 'capture-view'
export const VIEW_CAPTURE_PINNED = 'capture-view-pinned'
export const VIEW_UNKNOWN = 'unknown'

// DD-269: /catch/<slug> Deeplink — Slug-Regex bewusst eng (Lowercase / Ziffern / Bindestrich).
const CATCH_PATH_RE = /^\/catch\/([a-z0-9][a-z0-9-]*)\/?$/i

// DD-456: /capture Pfad — Bare-CaptureView auf bekannten Hosts.
const CAPTURE_PATH_RE = /^\/capture\/?$/i

// Pro Hostname explizite View-Zuweisung. Reihenfolge irrelevant — exakter Match.
export const HOST_VIEW_MAP = Object.freeze({
  'devdash.familie-riedel.org': VIEW_APP_SHELL,
  'issues.familie-riedel.org': VIEW_CAPTURE,
  'localhost': VIEW_APP_SHELL,
  '127.0.0.1': VIEW_APP_SHELL,
})

// Pattern-Match-Whitelist (Reihenfolge zählt — erstes Match gewinnt).
// Tailnet-IPs (100.64.0.0/10 CGNAT-Range) gelten als vertrauenswürdig.
export const HOST_PATTERNS = Object.freeze([
  { name: 'tailnet-cgnat', pattern: /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, view: VIEW_APP_SHELL },
])

// Fallback-Strategie für unbekannte Hostnames.
export const UNKNOWN_HOST_FALLBACK = VIEW_APP_SHELL
export const UNKNOWN_HOST_SHOW_BANNER = true

// DD-456: Ein Host gilt als "bekannt", wenn er exakt in HOST_VIEW_MAP steht ODER
// ein HOST_PATTERN (Tailnet) matcht. Nur auf bekannten Hosts greifen die Capture-
// Pfade (/capture, /catch/<slug>).
export function isKnownHost(host) {
  const h = String(host || '').toLowerCase()
  if (Object.prototype.hasOwnProperty.call(HOST_VIEW_MAP, h)) return true
  return HOST_PATTERNS.some((entry) => entry.pattern.test(h))
}

/**
 * Auflösung Hostname (+ optional URL-Search + pathname) → View-Identifier.
 *
 * @param {string} hostname  z.B. 'devdash.familie-riedel.org'
 * @param {string} [search='']  z.B. '?capture=1'
 * @param {string} [pathname='']  z.B. '/catch/devd'
 * @returns {{ view: string, source: string, hostname: string, slug?: string }}
 */
export function resolveView(hostname, search = '', pathname = '') {
  const host = String(hostname || '').toLowerCase()

  // 1. Forced override via ?capture=1 — höchste Priorität.
  if (typeof search === 'string' && search.includes('capture=1')) {
    return { view: VIEW_CAPTURE, source: 'query-override', hostname: host }
  }

  const known = isKnownHost(host)

  // 2. DD-269/DD-456 — Deeplink /catch/<slug> auf jedem BEKANNTEN Host.
  if (typeof pathname === 'string') {
    const m = pathname.match(CATCH_PATH_RE)
    if (m && known) {
      return {
        view: VIEW_CAPTURE_PINNED,
        source: 'deeplink-catch-slug',
        hostname: host,
        slug: m[1].toLowerCase(),
      }
    }
  }

  // 3. DD-456 — /capture Pfad → Bare-CaptureView auf jedem bekannten Host.
  if (typeof pathname === 'string' && known && CAPTURE_PATH_RE.test(pathname)) {
    return { view: VIEW_CAPTURE, source: 'path-capture', hostname: host }
  }

  // 4. Exact-Match Whitelist.
  if (Object.prototype.hasOwnProperty.call(HOST_VIEW_MAP, host)) {
    return { view: HOST_VIEW_MAP[host], source: 'whitelist-exact', hostname: host }
  }

  // 5. Pattern-Match Whitelist (Tailnet-IPs etc.).
  for (const entry of HOST_PATTERNS) {
    if (entry.pattern.test(host)) {
      return { view: entry.view, source: `whitelist-pattern:${entry.name}`, hostname: host }
    }
  }

  // 6. Unbekannt — bewusst NICHT still in eine Default-Branch fallen.
  return { view: VIEW_UNKNOWN, source: 'unknown-host', hostname: host }
}
