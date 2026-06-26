/**
 * IssueDetails — Detail-Screen eines Issues. Erste vertikale Wahrheit der
 * Extraktion: Fixture → DetailLayout → Widgets, End-to-End.
 *
 * Komposition: `DetailLayout` + `TextWidget` (Beschreibung) + `AttachmentWidget`
 * (Anhänge) + `ChecklistWidget` (Subtasks). Issues haben keine Kind-Issues →
 * kein ChildWidget. Presentational: nimmt das Issue als Prop (Default = Fixture),
 * mappt Felder auf Widget-Props. Kein Live-Fetch/Store.
 *
 * @param {object} props
 * @param {object} [props.issue] - Issue-Objekt (Form wie foundations/fixtures/issue.json)
 * @param {string} [props.dataUiScope='screen.issueDetails']
 */
import DetailLayout from './DetailLayout.jsx'
import TextWidget from '../organisms/complex/TextWidget.jsx'
import AttachmentWidget from '../organisms/complex/AttachmentWidget.jsx'
import ChecklistWidget from '../organisms/complex/ChecklistWidget.jsx'
import { statusLabel } from '../foundations/statusTone.js'
import issueFixture from '../foundations/fixtures/issue.json'

function fileName(path = '') {
  return String(path).split('/').pop() || path
}

export default function IssueDetails({ issue = issueFixture, dataUiScope = 'screen.issueDetails' }) {
  const meta = [issue.type, `P${issue.priority}`, `${(issue.subtasks || []).length} Subtasks`].filter(Boolean)
  const files = (issue.attachments || []).map((a) => ({
    name: a.file_name || fileName(a.file_path) || `Anhang ${a.id}`,
    meta: a.created_at || '',
  }))
  const checks = (issue.subtasks || []).map((s) => ({
    id: s.key || s.id,
    name: s.title || s.label || '',
    done: s.status === 'done' || s.done === 1 || s.done === true,
  }))

  return (
    <DetailLayout
      dataUiScope={`${dataUiScope}.layout`}
      title={{
        kind: 'issue',
        id: issue.key,
        name: issue.title,
        status: issue.status,
        statusLabel: statusLabel(issue.status),
        meta,
      }}
    >
      <TextWidget
        value={{ goal: issue.goal, background: issue.background, description: issue.description }}
        dataUiScope={`${dataUiScope}.widget.text`}
      />
      <AttachmentWidget files={files} dataUiScope={`${dataUiScope}.widget.attachments`} />
      <ChecklistWidget items={checks} dataUiScope={`${dataUiScope}.widget.checklist`} />
    </DetailLayout>
  )
}
