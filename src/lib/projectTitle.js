// DD-665 — Format the Project-Home screen title (and the browser-tab title)
// as `<PREFIX> - <NAME> (<SLUG>)`, e.g. "DD - Developer Dashboard (devd)".
// Makes a project unambiguous in the multi-tenant setup. Pure + testable.
// Defensive: missing prefix → drop the "PREFIX - " part; missing slug → drop
// the "(slug)" part. name falls back to a sane placeholder.

/**
 * @param {object} parts - { prefix, name, slug }
 * @returns {string} formatted title
 */
export function formatProjectHomeTitle({ prefix, name, slug } = {}) {
  const safeName = name || slug || 'Project'
  const base = slug ? `${safeName} (${slug})` : safeName
  return prefix ? `${prefix} - ${base}` : base
}
