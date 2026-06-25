/**
 * Issue-Key-Anzeige: "DD-7", "MBT-42".
 * Erwartet ein Objekt mit project_prefix + project_number (vom Backend mitgeliefert).
 * Fällt auf "#<id>" zurück, wenn die Felder fehlen.
 */
export function displayId(item) {
  if (!item) return ''
  if (item.project_prefix && item.project_number != null) {
    return `${item.project_prefix}-${item.project_number}`
  }
  return `#${item.id ?? '?'}`
}

/**
 * Sprint-Key-Anzeige: "DD#20", "MBT#5".
 * Hash trennt Sprint (#) von Issue (-) auf einen Blick.
 * Erwartet sprint mit project_prefix + project_number.
 */
export function formatSprintKey(sprint) {
  if (!sprint) return ''
  if (sprint.project_prefix && sprint.project_number != null) {
    return `${sprint.project_prefix}#${sprint.project_number}`
  }
  return `#${sprint.id ?? '?'}`
}
