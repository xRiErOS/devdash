// DD-375: Capture-Host API-Allowlist (Security-Hardening).
//
// issues.familie-riedel.org serves the public capture PWA and is NOT behind
// Authelia (its proxy path has no auth_request). On the LAN every request is a
// "trusted source", so the DD-285 token-auth no-ops → without this guard the
// FULL /api surface would be reachable from any LAN/Tailscale device via that
// host. We scope the capture host to the exact endpoints the CaptureView PWA
// calls; every other /api/* is blocked (403). Non-/api paths (the static PWA
// shell + assets) and all other hosts pass through untouched.
//
// Pure logic lives here so it can be unit-tested without an HTTP roundtrip
// (server/api.js does not export its Express app — listen() runs on import).

// The only endpoints CaptureView.jsx requests on the public capture host:
//   - GET  /api/projects/by-slug/:slug/capture   (pinned deep-link; resolves only
//                                                 public_capture=1 projects, DD-392)
//   - POST /api/issues                           (multipart issue + image capture;
//                                                 handler enforces public_capture=1
//                                                 for the target project on this host)
//
// DD-462 (B02): /api/projects/list-minimal was REMOVED from the public allowlist.
// Even host-filtered to public_capture=1 (DD-392) it still enumerated the set of
// public-capture projects (id/name/prefix/slug) to the internet. The public path is
// now deep-link only (/catch/<slug> → by-slug/:slug/capture); the bare full-dropdown
// CaptureView is an owner feature, reachable only on authenticated/tailnet hosts
// (devdash.* behind Authelia, localhost) where list-minimal stays unblocked.
//
// Entries are matched by exact `path` OR by `pattern` (regex) for parameterised routes.
export const CAPTURE_API_ALLOWLIST = [
  { method: 'GET', pattern: /^\/api\/projects\/by-slug\/[^/]+\/capture$/ },
  { method: 'POST', path: '/api/issues' },
]

export const DEFAULT_CAPTURE_HOST = 'issues.familie-riedel.org'

// Normalised host comparison (lowercase, port stripped) used by both the guard
// and host-aware handlers (e.g. DD-392 list-minimal filtering).
export function hostIsCaptureHost(host, captureHost = DEFAULT_CAPTURE_HOST) {
  const h = String(host || '').toLowerCase().split(':')[0]
  return h === String(captureHost || '').toLowerCase()
}

/**
 * Decide whether a request on the capture host must be blocked.
 *
 * Returns true ONLY when the request targets the capture host on a non-allowed
 * /api/* route. Everything else (other hosts, non-/api paths, OPTIONS preflight,
 * allowlisted endpoints) returns false → request proceeds.
 *
 * @param {object}  args
 * @param {string}  args.host         req.hostname (or Host header), case-insensitive, port stripped by caller is fine
 * @param {string}  args.method       HTTP method (GET, POST, …)
 * @param {string}  args.path         req.path (no query string)
 * @param {string} [args.captureHost] override; defaults to DEFAULT_CAPTURE_HOST
 * @returns {boolean} true = block (403), false = allow through
 */
export function shouldBlockOnCaptureHost({ host, method, path, captureHost = DEFAULT_CAPTURE_HOST }) {
  if (!hostIsCaptureHost(host, captureHost)) return false
  if (String(method || '').toUpperCase() === 'OPTIONS') return false // CORS preflight
  if (!String(path || '').startsWith('/api/')) return false
  const m = String(method || '').toUpperCase()
  const allowed = CAPTURE_API_ALLOWLIST.some(
    (r) => r.method === m && (r.path ? r.path === path : r.pattern.test(path)),
  )
  return !allowed
}
