// DD-274 — Memory-Feature availability detection.
//
// Memory-API depends on a local Ollama-instance (bge-m3 embeddings) plus the
// SQLite-vec extension. The NAS-deployment (devdash.familie-riedel.org) has
// neither — calling /api/memories there currently bubbles a 500 out to the
// browser when Ollama isn't reachable.
//
// We therefore short-circuit on the client: when the host matches a known
// "memory-disabled" hostname we surface a clear banner instead of trying to
// fetch. The check is intentionally a tiny pure helper so it's trivial to
// unit-test (see tests/dd-274-memory-availability/*).
//
// Override hook: ?memory=force on the URL re-enables the feature even on
// disabled hosts (for ad-hoc debugging from the NAS shell).

// Hosts where the Memory-MCP backing stack is known to be absent.
// Keep this list narrow — false-positives lock users out of a working feature.
const DISABLED_HOSTNAMES = new Set([
  'devdash.familie-riedel.org',
])

// Sub-domain suffixes that disable the feature (covers staging mirrors etc.).
const DISABLED_HOSTNAME_SUFFIXES = [
  // Reserved for future NAS mirrors. Empty by default to keep behaviour
  // predictable.
]

export function isMemoryFeatureAvailable(hostname, search = '') {
  if (typeof hostname !== 'string' || hostname.length === 0) {
    // SSR / unknown environment — assume available so local dev keeps working.
    return true
  }

  // Explicit override wins. Useful when debugging on the NAS itself.
  if (typeof search === 'string' && search.includes('memory=force')) {
    return true
  }

  const lower = hostname.toLowerCase()
  if (DISABLED_HOSTNAMES.has(lower)) return false
  for (const suffix of DISABLED_HOSTNAME_SUFFIXES) {
    if (lower.endsWith(suffix)) return false
  }
  return true
}

export function memoryUnavailableMessage(hostname) {
  return (
    `Das Memory-Feature ist auf "${hostname}" nicht verfügbar — der lokale ` +
    `Memory-MCP-Stack (Ollama + sqlite-vec) läuft nur auf dem Entwickler-Mac. ` +
    `Bitte starte DevDashboard lokal, um Memories zu pflegen.`
  )
}

// Exported for tests so the lists stay encapsulated but inspectable.
export const __testables = { DISABLED_HOSTNAMES, DISABLED_HOSTNAME_SUFFIXES }
