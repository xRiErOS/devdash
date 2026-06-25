// DD-313 / DD-45 D30 — description ist soft-deprecated im Sinne von:
// DB-Spalte bleibt, kein DROP COLUMN, Capture/Anzeige/CLI duerfen weiterhin
// nutzen. Sanitizer ist ein Identity-Passthrough — historisch wurde das Feld
// in API-Responses auf null gesetzt; PO-Decision D30 (2026-05-24) revidiert
// das. Helfer bleibt als Hook erhalten, falls spaeter eine andere Sanitizing-
// Logik (z.B. Length-Truncation) eingefuehrt wird.

export function sanitizeDeprecatedDescription(row) {
  if (!row || typeof row !== 'object') return row
  return row
}

export function sanitizeDeprecatedDescriptions(rows) {
  return rows.map(row => sanitizeDeprecatedDescription(row))
}
