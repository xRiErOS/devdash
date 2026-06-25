// ADR 2026-04-29: Sprint-Key analog zu Issues — "<PREFIX>#<NR>".
// Format Lang: "DD#20 — Name", Kurz: "DD#20 Name".
// Fallback (Legacy): "Sprint <N> — Name", oder nur sprint.name.
export function sprintKey(sprint) {
  if (!sprint) return ''
  if (sprint.project_prefix && sprint.project_number != null) {
    return `${sprint.project_prefix}#${sprint.project_number}`
  }
  if (sprint.project_number != null) return `Sprint ${sprint.project_number}`
  return ''
}

export function sprintLabel(sprint) {
  if (!sprint) return ''
  const key = sprintKey(sprint)
  const name = sprint.name || ''
  if (!key) return name
  return name ? `${key} — ${name}` : key
}

export function sprintShortLabel(sprint) {
  if (!sprint) return ''
  const key = sprintKey(sprint)
  const name = sprint.name || ''
  if (!key) return name
  return name ? `${key} ${name}` : key
}
