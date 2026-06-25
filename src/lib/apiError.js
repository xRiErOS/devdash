// DD-45 R02: Einheitlicher Fehlerparser fuer Backend-Responses.
// Server liefert je nach Pfad `{ error }`, `{ detail }`, `{ reason }` oder
// reinen Text — UI braucht eine lesbare Nachricht in allen Faellen.
export async function parseApiError(res, fallback = 'Fehler') {
  try {
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (ct.includes('application/json')) {
      const j = await res.json()
      return j.error || j.detail || j.reason || j.message || fallback
    }
    const t = (await res.text()).trim()
    if (t) return t
  } catch {
    // fall through
  }
  return `${fallback} (HTTP ${res.status})`
}
