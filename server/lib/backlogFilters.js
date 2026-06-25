// ProjectPages T-be4 (Backend-I06/D01): Backlog-List-Filter-Bausteine.
// Single-Source der neuen priority-Filter-Logik, von GET /api/backlog konsumiert und
// unit-getestet (kein Query-Reproduktions-Drift). Mirror des status-Komma-Listen-Musters.

// priority: string|number|undefined ("1" oder "1,2"). Gültiger Bereich 1–5 (vgl.
// contracts/backlog.contracts.js prioritySchema). Ungültige/Out-of-range-Werte werden
// verworfen; bleibt nichts übrig → null (= kein Filter).
export function priorityFilter(raw) {
  if (raw == null) return null
  const wanted = String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 5)
  if (wanted.length === 0) return null
  if (wanted.length === 1) return { clause: 'b.priority = ?', params: [wanted[0]] }
  return { clause: `b.priority IN (${wanted.map(() => '?').join(',')})`, params: wanted }
}
