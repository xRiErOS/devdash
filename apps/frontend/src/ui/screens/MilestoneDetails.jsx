/**
 * MilestoneDetails — Detail-Screen eines Milestones. Reicht das geteilte
 * `DetailLayout` mit Milestone-spezifischen Widgets: TextWidget (Beschreibung) +
 * ChildWidget (Sprints des Milestones) + ChecklistWidget (DoD-Items).
 * Presentational; nimmt den Milestone als Prop (Default = Fixture).
 *
 * @param {object} props
 * @param {object} [props.milestone] - Form wie foundations/fixtures/milestone.json
 * @param {string} [props.dataUiScope='screen.milestoneDetails']
 */
import DetailLayout from './DetailLayout.jsx'
import TextWidget from '../organisms/complex/TextWidget.jsx'
import ChildWidget from '../organisms/complex/ChildWidget.jsx'
import ChecklistWidget from '../organisms/complex/ChecklistWidget.jsx'
import { statusLabel } from '../foundations/statusTone.js'
import milestoneFixture from '../foundations/fixtures/milestone.json'

// Milestones haben keinen kurzen Key — führendes 'M<n>' aus dem Namen ziehen.
function splitName(name = '') {
  const m = /^(M\d+)\s+(.*)/.exec(name)
  return m ? { id: m[1], rest: m[2] } : { id: name, rest: name }
}

export default function MilestoneDetails({ milestone = milestoneFixture, dataUiScope = 'screen.milestoneDetails' }) {
  const { id, rest } = splitName(milestone.name)
  const sprints = (milestone.sprints || []).map((s) => ({
    id: s.key,
    kind: 'sprint',
    name: s.name,
    status: s.status,
    statusLabel: statusLabel(s.status),
  }))
  const dod = (milestone.dod_items || []).map((d) => ({
    id: d.id != null ? `DoD-${d.id}` : d.label,
    name: d.label || d.details || '',
    done: d.done === 1 || d.done === true,
  }))

  return (
    <DetailLayout
      dataUiScope={`${dataUiScope}.layout`}
      title={{
        kind: 'milestone',
        id,
        name: rest,
        status: milestone.status,
        statusLabel: statusLabel(milestone.status),
        meta: [`${sprints.length} Sprints`, milestone.target_date].filter(Boolean),
      }}
    >
      <TextWidget value={{ description: milestone.description }} dataUiScope={`${dataUiScope}.widget.text`} />
      <ChildWidget title="Sprints" items={sprints} dataUiScope={`${dataUiScope}.widget.children`} />
      <ChecklistWidget title="Definition of Done" items={dod} dataUiScope={`${dataUiScope}.widget.dod`} />
    </DetailLayout>
  )
}
