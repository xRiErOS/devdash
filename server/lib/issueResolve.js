// DD-378 (D04 completion): Kanonische Issue-Auflösung über `project_number`.
//
// Hintergrund
// -----------
// DD-368/DD-347 haben Slug-Routing eingeführt (`/:slug/issues/:id`), Issues
// lösten aber weiterhin über die GLOBALE `backlog.id` auf. Kanonisch soll die
// pro-Projekt fortlaufende `project_number` sein — `/devd/issues/348` meint
// "Issue #348 des Projekts devd", nicht globale backlog-Zeile 348. Das ist
// konsistent mit der Anzeige (`displayId` → PREFIX-project_number).
//
// Dual-Resolution (rückwärtskompatibel)
// -------------------------------------
// Während der Übergangsphase existieren noch Alt-Links/Bookmarks, die die
// globale `backlog.id` im URL-Segment tragen. Deshalb löst der zentrale
// Resolver zweistufig auf:
//   1. ZUERST als `project_number` im aktuellen Projekt (kanonischer Pfad).
//   2. Findet sich keine Zeile, als globale `backlog.id` (Legacy-Fallback) —
//      aber nur, wenn diese Zeile zum aktuellen Projekt gehört (kein
//      Cross-Project-Leak über geratene IDs).
//
// Der Resolver ist eine reine Funktion (DB + projectId + number rein,
// backlog.id raus) und damit direkt unit-testbar.

/**
 * Auflösungs-Resultat.
 * @typedef {Object} IssueResolution
 * @property {number} id            globale backlog.id (technischer PK)
 * @property {number} projectNumber pro-Projekt fortlaufende Nummer
 * @property {'project_number'|'legacy_id'} via  welcher Pfad gegriffen hat
 */

/**
 * Löst (projectId, number) → kanonische backlog.id auf.
 *
 * Reihenfolge: project_number zuerst, dann globale backlog.id als
 * Legacy-Fallback (beide projekt-gescopet). Gibt `null`, wenn keine Zeile im
 * Projekt passt.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} projectId  aktives Projekt (aus currentProjectId / X-Project-Id)
 * @param {number|string} number  Zahl aus dem URL-Segment (project_number ODER legacy id)
 * @returns {IssueResolution|null}
 */
export function resolveIssueByNumber(db, projectId, number) {
  const pid = Number(projectId)
  const n = Number(number)
  if (!Number.isFinite(pid) || pid <= 0) return null
  if (!Number.isFinite(n) || n < 0) return null

  // (1) Kanonisch: project_number im aktuellen Projekt.
  const byNumber = db
    .prepare('SELECT id, project_number FROM backlog WHERE project_id = ? AND project_number = ?')
    .get(pid, n)
  if (byNumber) {
    return { id: byNumber.id, projectNumber: byNumber.project_number, via: 'project_number' }
  }

  // (2) Legacy-Fallback: globale backlog.id — aber nur im aktuellen Projekt,
  // damit ein geratenes Segment nicht in ein fremdes Projekt zeigt.
  const byId = db
    .prepare('SELECT id, project_number FROM backlog WHERE project_id = ? AND id = ?')
    .get(pid, n)
  if (byId) {
    return { id: byId.id, projectNumber: byId.project_number, via: 'legacy_id' }
  }

  return null
}
