/**
 * CreateActions — Erstellen-Leiste des RoadmapBoard: drei nebeneinander stehende
 * Buttons, je Entität einer (Meilenstein / Sprint / Issue). Bewusst kein
 * Split-/Dropdown-Button (PO 2026-06-26) — alle drei sind gleichrangige
 * Einstiege, das Board ist die Projekt-Zentrale.
 *
 * Reines Molecule, props-driven: jeder Button feuert seinen Callback (Mockup:
 * Story-Spy; echte Navigation/Anlage folgt im Connected-Wrapper, Phase 3).
 *
 * @param {object} props
 * @param {()=>void} [props.onCreateMilestone]
 * @param {()=>void} [props.onCreateSprint]
 * @param {()=>void} [props.onCreateIssue]
 * @param {string} [props.dataUiScope='molecule.createActions']
 * @param {string} [props.className]
 */
import Button from '../atoms/Button.jsx'

export default function CreateActions({
  onCreateMilestone, onCreateSprint, onCreateIssue,
  dataUiScope = 'molecule.createActions', className = '',
}) {
  return (
    <div data-ui={dataUiScope} className={`grid grid-cols-3 items-center gap-[var(--space-1)] ${className}`}>
      <Button variant="ghost" size="sm" iconName="milestone" onClick={onCreateMilestone} dataUiScope={`${dataUiScope}.milestone`} className="w-full justify-center">
        Meilenstein
      </Button>
      <Button variant="ghost" size="sm" iconName="board" onClick={onCreateSprint} dataUiScope={`${dataUiScope}.sprint`} className="w-full justify-center">
        Sprint
      </Button>
      <Button variant="ghost" size="sm" iconName="add" onClick={onCreateIssue} dataUiScope={`${dataUiScope}.issue`} className="w-full justify-center">
        Issue
      </Button>
    </div>
  )
}
