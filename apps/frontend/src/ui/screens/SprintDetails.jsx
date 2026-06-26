/**
 * SprintDetails — Detail-Screen eines Sprints. Reicht das geteilte `DetailLayout`
 * mit Sprint-spezifischen Widgets: TextWidget (Goal/Notes) + ChildWidget (Issues
 * des Sprints). Presentational; nimmt den Sprint als Prop (Default = Fixture).
 *
 * @param {object} props
 * @param {object} [props.sprint] - Form wie foundations/fixtures/sprint.json
 * @param {string} [props.dataUiScope='screen.sprintDetails']
 */
import DetailLayout from './DetailLayout.jsx'
import TextWidget from '../organisms/complex/TextWidget.jsx'
import ChildWidget from '../organisms/complex/ChildWidget.jsx'
import { statusLabel } from '../foundations/statusTone.js'
import sprintFixture from '../foundations/fixtures/sprint.json'

export default function SprintDetails({ sprint = sprintFixture, dataUiScope = 'screen.sprintDetails' }) {
  const items = (sprint.items || []).map((it) => ({
    id: it.key,
    kind: 'issue',
    type: it.type,
    name: it.title,
    status: it.status,
    statusLabel: statusLabel(it.status),
  }))

  return (
    <DetailLayout
      dataUiScope={`${dataUiScope}.layout`}
      title={{
        kind: 'sprint',
        id: sprint.key,
        name: sprint.name,
        status: sprint.status,
        statusLabel: statusLabel(sprint.status),
        meta: [`${items.length} Issues`].filter(Boolean),
      }}
    >
      <TextWidget
        value={{ goal: sprint.goal, description: sprint.notes }}
        dataUiScope={`${dataUiScope}.widget.text`}
      />
      <ChildWidget title="Issues" items={items} dataUiScope={`${dataUiScope}.widget.children`} />
    </DetailLayout>
  )
}
