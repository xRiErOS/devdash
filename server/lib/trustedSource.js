// DD-297 — Trusted-Source-Erkennung fuer Token-Middleware-Bypass.
//
// Liefert true wenn req.ip aus einem als trusted geltenden Netz stammt:
// - Loopback (127.0.0.1, ::1)
// - RFC1918 Private IPv4 (10.x, 172.16-31.x, 192.168.x)
// - IPv6 ULA (fc00::/7), Link-local (fe80::)
// - Tailscale CGNAT (100.64.0.0/10) — KI-Agenten + Direkt-Browser via 100.x
//
// app.set('trust proxy', ['loopback', 'uniquelocal']) sorgt dafuer, dass
// req.ip bereits den un-spoofbaren Peer reflektiert. Quellen ausserhalb der
// hier gelisteten Ranges duerfen weder Remote-* Header injizieren noch die
// DD-285 Token-Middleware umgehen.

export function isTrustedSource(ip) {
  if (!ip || typeof ip !== 'string') return false
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')) return true
  if (/^10\./.test(ip) || /^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true
  if (/^::ffff:10\./.test(ip) || /^::ffff:192\.168\./.test(ip)) return true
  if (/^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true
  if (/^fc/i.test(ip) || /^fd/i.test(ip) || /^fe80:/i.test(ip)) return true
  // Tailscale CGNAT: 100.64.0.0 - 100.127.255.255
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true
  if (/^::ffff:100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true
  return false
}
