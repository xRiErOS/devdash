// DD-393 — abuse guards for the public capture host (issues.*).
//
// Once a project opts into public_capture (DD-392), POST /api/issues is reachable
// by anyone on the internet via Cloudflare. These guards bound the blast radius of
// a troll without breaking the legitimate tester flow. The strong edge layer
// (Cloudflare Turnstile + WAF rate-limit) is configured in the Cloudflare dashboard
// (see DD-393 / PR); the helpers here are the app-side defense-in-depth.
//
// Pure logic lives here so it can be unit-tested without an HTTP roundtrip
// (server/api.js does not export its Express app).

// Per-project public captures per UTC day before further POSTs are rejected (429).
export const PUBLIC_CAPTURE_DAILY_CAP =
  Number(process.env.PUBLIC_CAPTURE_DAILY_CAP) || 50

// Global circuit-breaker: total public captures across all projects per UTC day.
export const PUBLIC_CAPTURE_GLOBAL_DAILY_CAP =
  Number(process.env.PUBLIC_CAPTURE_GLOBAL_DAILY_CAP) || 300

// Max image size accepted on the public capture host (tighter than the 8 MB the
// authenticated catcher allows) so mass uploads cannot fill the NAS disk.
export const PUBLIC_CAPTURE_MAX_FILE_BYTES =
  Number(process.env.PUBLIC_CAPTURE_MAX_FILE_BYTES) || 4 * 1024 * 1024

// Rate-limit bucket key. Behind Cloudflare→NPM, express-rate-limit's default
// req.ip resolves to the Cloudflare EDGE ip (CF is public → not a trusted proxy),
// so a per-IP limit would bucket ALL public traffic under a handful of CF ips —
// useless against a single attacker and unfair to legitimate users. Cloudflare
// sets CF-Connecting-IP to the real client; prefer it. Non-CF requests (direct
// NAS:3001 over Tailscale/LAN) have no such header → fall back to the connection ip.
//
// Threat model: the public ingress is ALWAYS Cloudflare, which overwrites
// CF-Connecting-IP — an internet attacker cannot forge it. A LAN/Tailscale client
// could set it, but that network is trusted and not the threat here.
export function resolveCaptureClientIp({ cfConnectingIp, fallbackIp }) {
  const first = String(cfConnectingIp || '').split(',')[0].trim()
  if (first && isLikelyIp(first)) return first
  return String(fallbackIp || '')
}

function isLikelyIp(s) {
  // Cheap sanity check — this is only a rate-limit bucket key, not auth. Accepts
  // IPv4/IPv6 character sets; rejects anything else (header tampering / junk).
  return s.length <= 45 && /^[0-9a-fA-F:.]+$/.test(s)
}

// Returns the reason a public capture must be rejected, or null if allowed.
// `projectCount` / `globalCount` are today's existing public-capture counts.
export function captureCapRejection({ projectCount, globalCount,
  projectCap = PUBLIC_CAPTURE_DAILY_CAP, globalCap = PUBLIC_CAPTURE_GLOBAL_DAILY_CAP }) {
  if (globalCount >= globalCap) return { code: 'PUBLIC_CAPTURE_GLOBAL_LIMIT', cap: globalCap }
  if (projectCount >= projectCap) return { code: 'PUBLIC_CAPTURE_DAILY_LIMIT', cap: projectCap }
  return null
}
