/**
 * EntityPill (03.20 Display) — kanonische Entitäts-Pille (D-pill-badge-taxonomy).
 * Konsolidiert SprintPill/IssuePill/MilestonePill: Content-Shape ID / ID+Name /
 * Name, Entität = Appearance-Achse (Farbe + Icon), Render span | link | button.
 * Muster = Button/Pill. tags status:stable (neu, CONV-status-reife-flow 404).
 */
import EntityPill from '../../../components/ui/atoms/EntityPill.jsx'

const ENTITIES = ['sprint', 'issue', 'milestone', 'dod', 'todo', 'neutral']

const meta = {
  title: '03 ATOMS/03.20 Display/EntityPill',
  component: EntityPill,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    entity: { control: 'select', options: ENTITIES, description: 'Appearance: Farbe + optional Icon je Entität.' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    showName: { control: 'boolean', description: 'false → nur ID.' },
    id: { control: 'text' },
    name: { control: 'text' },
  },
  args: { id: 'DD-42', name: 'Slug Routing', entity: 'sprint', size: 'md', showName: true },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.entity-pill.default"><EntityPill {...args} /></div>
  ),
}

// Appearance = Entitäts-Achse (Farbe + optional Icon).
export const Appearance = {
  render: () => (
    <div data-ui="atom.entity-pill.appearance" className="flex flex-wrap gap-2">
      {ENTITIES.map((e) => (
        <EntityPill key={e} id={`${e.slice(0, 1).toUpperCase()}-7`} name={e} entity={e} data-ui={`atom.entity-pill.appearance-${e}`} />
      ))}
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.entity-pill.sizes" className="flex items-center gap-2">
      {['sm', 'md'].map((s) => (
        <EntityPill key={s} id="DD-7" name="Größe" entity="sprint" size={s} data-ui={`atom.entity-pill.size-${s}`} />
      ))}
    </div>
  ),
}

// Composition = Content-Shapes (ID / ID+Name / Name) + Render-Modi (span/link/button).
export const Composition = {
  render: () => (
    <div data-ui="atom.entity-pill.composition" className="flex flex-wrap items-center gap-2">
      <EntityPill id="DD-7" entity="sprint" showName={false} data-ui="atom.entity-pill.shape-id" />
      <EntityPill id="DD-7" name="ID + Name" entity="sprint" data-ui="atom.entity-pill.shape-id-name" />
      <EntityPill name="Nur Name" entity="milestone" data-ui="atom.entity-pill.shape-name" />
      <EntityPill id="DD-7" name="Link" entity="issue" href="#" data-ui="atom.entity-pill.mode-link" />
      <EntityPill id="DD-7" name="Button" entity="issue" onClick={() => {}} data-ui="atom.entity-pill.mode-button" />
    </div>
  ),
}
