// DD-368 (D04): Entitäts-Slug-Format `<id>-<kebab-slug>`.
//
// Kanonisch ist die FÜHRENDE GANZZAHL. Der optionale `-kebab`-Suffix ist rein
// dekorativ und wird für die Datenauflösung vollständig ignoriert. Eingehende
// Links ohne Suffix (`/devd/milestones/17`) bleiben gültig.
//
// Für Issues ist die Zahl die `project_number` (das menschenlesbare DD-348-
// Schema), nicht die globale `backlog.id` — konsistent mit `displayId`.

/**
 * Liest die kanonische numerische ID aus einem URL-Segment.
 * `parseInt` greift bis zum ersten Nicht-Ziffern-Zeichen → Suffix ignoriert.
 *
 * @param {string|number|undefined} segment z.B. "17-project-home-tab" oder "17"
 * @returns {number|null} die ID oder null wenn keine führende Ganzzahl
 */
export function parseEntityId(segment) {
  if (segment == null) return null
  const n = parseInt(String(segment), 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Baut ein lesbares Entitäts-Segment `<id>-<kebab-slug>`.
 * Ohne Titel wird nur die nackte ID zurückgegeben (immer gültiger Link).
 *
 * @param {number|string} id   numerische ID (project_number bei Issues)
 * @param {string} [title]     optionaler Titel → kebab-Suffix
 * @returns {string}
 */
export function buildEntitySlug(id, title) {
  const base = String(id)
  if (!title) return base
  const kebab = String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return kebab ? `${base}-${kebab}` : base
}

/**
 * DD-378 (D04 completion): Baut den kanonischen Issue-Pfad-Anteil aus der
 * `project_number` (NICHT der globalen backlog.id). Konsumenten verlinken
 * damit `/${slug}/issues/<project_number>[-<slug>]`.
 *
 * Wichtig: Nur aufrufen, wenn die `project_number` vorliegt. Wo nur die globale
 * backlog.id verfügbar ist (z.B. Issue-Dependencies, die per FK auf backlog.id
 * zeigen), darf weiterhin die id ins Segment — der Backend-Resolver löst sie
 * über den Legacy-Fallback auf und ItemDetail normalisiert die URL danach auf
 * die project_number.
 *
 * @param {number|string} projectNumber  pro-Projekt fortlaufende Nummer
 * @param {string} [title]               optionaler Titel → kebab-Suffix
 * @returns {string} z.B. "348-canonical-issue-urls"
 */
export function buildIssueSegment(projectNumber, title) {
  return buildEntitySlug(projectNumber, title)
}
