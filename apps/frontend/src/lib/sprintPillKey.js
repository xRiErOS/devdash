/**
 * sprintPillKey — leitet den Anzeige-Key eines Sprints für die SprintPill ab.
 *
 * Domänen-Helfer: bewusst NICHT im präsentationalen `ui/atoms/SprintPill`-Atom
 * (das nimmt nur den fertigen `id`-String). Der Konsument berechnet den Key hier
 * und reicht ihn als `id`-Prop durch (DD-481 T-CON2, Atomic-Design-Trennung).
 *
 *  - `<prefix>#<number>`  wenn beides vorhanden (z.B. "DD#42")
 *  - `Sprint <number>`    wenn nur die Nummer existiert
 *  - `''`                 sonst (kein Sprint / unvollständig)
 *
 * @param {{project_prefix?: string, project_number?: number}|null|undefined} sprint
 * @returns {string}
 */
export function sprintPillKey(sprint) {
  if (!sprint) return ''
  const { project_prefix, project_number } = sprint
  if (project_prefix && project_number != null) return `${project_prefix}#${project_number}`
  if (project_number != null) return `Sprint ${project_number}`
  return ''
}
