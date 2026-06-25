/**
 * sprintStatusColor — mappt einen Sprint-Status auf den präsentationalen
 * `color`-Prop-Wert des `ui/atoms/SprintPill`-Atoms.
 *
 * Domänen→Semantik-Mapping (bewusst NICHT im Atom — das nimmt nur `color`):
 * der Konsument reicht `color={sprintStatusColor(sprint.status)}` durch
 * (DD-481 T-CON2). Erhält die status-basierte Färbung der Pille über das
 * Redesign hinweg (Legacy mappte intern auf rohe Catppuccin-Töne; jetzt auf
 * die semantischen `--accent-*`-Tokens des Atoms).
 *
 *  - completed → success   (vormals --green)
 *  - active    → warning   (vormals --peach)
 *  - review    → info      (vormals --mauve)
 *  - planning / cancelled / closed / sonstige → neutral
 *
 * @param {string} [status]
 * @returns {'success'|'warning'|'info'|'neutral'}
 */
export function sprintStatusColor(status) {
  switch (status) {
    case 'completed': return 'success'
    case 'active': return 'warning'
    case 'review': return 'info'
    default: return 'neutral'
  }
}
