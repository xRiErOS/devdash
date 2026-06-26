/**
 * roadmapBoardFilter — reine Such-Filterung des RoadmapBoard (kein React).
 *
 * PO-Regel (2026-06-26):
 *  - Eine Meilenstein-Spalte ist sichtbar bei **Eigen-Treffer** (Name oder M-Key)
 *    ODER wenn **mindestens ein Sprint** trifft.
 *  - Bei Eigen-Treffer: ALLE Sprints der Spalte bleiben sichtbar.
 *  - Bei reinem Sprint-Treffer: nur die treffenden Sprints bleiben.
 *  - „Nicht zugeordnet": nur treffende Sprints.
 *  - Leere/Whitespace-Query: Eingabe unverändert (identische Struktur).
 *
 * Match = case-insensitive Teilstring auf Sprint `name`/`key` bzw. Meilenstein
 * `name`/`M{id}`. Reiner Mapper, mutiert die Eingabe nicht.
 *
 * @param {object} data
 * @param {Array} [data.milestones=[]] - Meilensteine mit genested `sprints[]`
 * @param {Array} [data.unassignedSprints=[]] - Sprints ohne Meilenstein
 * @param {string} [query=''] - Suchbegriff
 * @returns {{ milestones: Array, unassignedSprints: Array }}
 */
function norm(v) {
  return String(v ?? '').toLowerCase()
}

function sprintMatches(sprint, q) {
  return norm(sprint.name).includes(q) || norm(sprint.key).includes(q)
}

function milestoneSelfMatches(milestone, q) {
  return norm(milestone.name).includes(q) || `m${norm(milestone.id)}`.includes(q)
}

export function filterRoadmap({ milestones = [], unassignedSprints = [] } = {}, query = '') {
  const q = norm(query).trim()
  if (!q) return { milestones, unassignedSprints }

  const filteredMilestones = []
  for (const m of milestones) {
    const sprints = m.sprints || []
    const self = milestoneSelfMatches(m, q)
    const hits = sprints.filter((s) => sprintMatches(s, q))
    if (!self && hits.length === 0) continue
    filteredMilestones.push({ ...m, sprints: self ? sprints : hits })
  }

  const filteredUnassigned = unassignedSprints.filter((s) => sprintMatches(s, q))

  return { milestones: filteredMilestones, unassignedSprints: filteredUnassigned }
}
