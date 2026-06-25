// @ts-check
// DD-611 (Sprint DD#77): Toleranter Key-Parser für Entity-Verb-ID-Eingaben.
// Single Source für CLI + MCP — beide Resolver (resolveSprintId/resolveIssueId) leiten
// hieraus ab statt je eigenes Regex zu pflegen (dasselbe Anti-Duplikations-Ziel wie DD-557).
//
// Akzeptiert eine Referenz in jeder dieser Schreibweisen:
//   "77"      → { id: 77 }                 (numerische Roh-ID)
//   "DD#77"   → { prefix: 'DD', number: 77 }
//   "DD-77"   → { prefix: 'DD', number: 77 }
//   "dd-77"   → { prefix: 'DD', number: 77 }   (case-insensitiv)
//   "dd77"    → { prefix: 'DD', number: 77 }   (ohne Separator)
//   "#77"     → { number: 77 }              (Sprint bare, prefix-los)
// Alles andere → null (Caller wirft / reicht 404 durch).

/**
 * @typedef {{ id: number } | { prefix?: string, number: number } | null} ParsedRef
 */

/**
 * @param {string|number|null|undefined} input
 * @returns {ParsedRef}
 */
export function parseRef(input) {
  if (input == null) return null
  const s = String(input).trim()
  if (s === '') return null

  // Roh-ID
  if (/^\d+$/.test(s)) return { id: Number(s) }

  // Prefix-los mit '#' (Sprint bare): "#77"
  const bare = s.match(/^#(\d+)$/)
  if (bare) return { number: Number(bare[1]) }

  // MIT Separator -/#: Prefix (2–6, darf Ziffern enthalten) — Separator disambiguiert.
  // "DD#77", "DD-77", "dd-77", "A1-5".
  const sep = s.match(/^([A-Za-z][A-Za-z0-9]{1,5})[-#](\d+)$/)
  if (sep) return { prefix: sep[1].toUpperCase(), number: Number(sep[2]) }

  // OHNE Separator: nur Buchstaben-Prefix (2–6) + Nummer — sonst mehrdeutig.
  // "dd77" → DD+77. "A77" wäre A7+7 oder A+77 → bewusst abgelehnt (kein realer Prefix).
  const nosep = s.match(/^([A-Za-z]{2,6})(\d+)$/)
  if (nosep) return { prefix: nosep[1].toUpperCase(), number: Number(nosep[2]) }

  return null
}
