/**
 * ProjectCard — Einzel-Projekt-Karte für ToolHome-Grid.
 * Presentational. Alle Zustände über Props (kein MSW nötig).
 */
import { fn } from 'storybook/test'
import ProjectCard from './ProjectCard.jsx'
import { PROJECT_FIXTURES } from '../../foundations/fixtures/projects.demo.js'

const meta = {
  title: '04 ORGANISMS/ProjectCard',
  component: ProjectCard,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
}
export default meta

// Vollständige Daten: Prefix, Name, Description, Sprint+Backlog-Counts, aktiver Sprint.
export const Default = {
  render: () => (
    <ProjectCard
      project={PROJECT_FIXTURES[0]}
      onSelect={fn()}
      dataUiScope="organism.projectCard.story.default"
    />
  ),
}

// active_sprint=null → kein ActiveSprintChip.
export const KeinAktiverSprint = {
  render: () => (
    <ProjectCard
      project={PROJECT_FIXTURES[1]}
      onSelect={fn()}
      dataUiScope="organism.projectCard.story.keinSprint"
    />
  ),
}

// Nur Pflichtfelder — kein description, 0 Counts, kein Sprint.
export const MinimalDaten = {
  render: () => (
    <ProjectCard
      project={{
        id: 99,
        slug: 'min',
        name: 'Minimal',
        prefix: 'MIN',
        color: 'blue',
        description: null,
        sprint_count: 0,
        backlog_count: 0,
        active_sprint: null,
        archived: 0,
      }}
      onSelect={fn()}
      dataUiScope="organism.projectCard.story.minimal"
    />
  ),
}

// Langer Name → truncate-Verhalten testen.
export const LangerName = {
  render: () => (
    <ProjectCard
      project={{
        ...PROJECT_FIXTURES[0],
        name: 'Ein sehr langer Projektname der definitiv überläuft ohne truncate',
      }}
      onSelect={fn()}
      dataUiScope="organism.projectCard.story.langerName"
    />
  ),
}
