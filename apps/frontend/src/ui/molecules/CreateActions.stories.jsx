/**
 * CreateActions — Erstellen-Leiste (3 Buttons je Entität) des RoadmapBoard.
 * Presentational; Callbacks als Spies. 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import CreateActions from './CreateActions.jsx'

const meta = {
  title: '03 MOLECULES/CreateActions',
  component: CreateActions,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  args: { onCreateMilestone: fn(), onCreateSprint: fn(), onCreateIssue: fn() },
}
export default meta

export const Default = {}
