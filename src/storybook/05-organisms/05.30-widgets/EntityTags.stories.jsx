/**
 * GF-330 — EntityTags (W2, 05.30 Widgets). Tag-Zuweisung der Entity-Detail-Schicht
 * (Konkretisierung §4 Tags): zugewiesene Tags als entfernbare Chips (TagChip) +
 * Zuweisen/Anlegen via Multi-Select (TagMultiSelect). NICHT TagsCard (Projekt-CRUD).
 * Controlled/präsentational — kein Live-Fetch.
 *
 * data-ui je Story-Wrapper UND je Chip/Control (PO spricht jedes 1:1 an).
 */
import { useState } from 'react'
import EntityTags from '../../../components/ui/organisms/EntityTags.jsx'

const noop = () => {}

// Stateful decorator: manages the adding-toggle so the inline render stays args-visible.
function WithAddingState(Story, context) {
  const [adding, setAdding] = useState(false)
  return (
    <Story
      {...context}
      args={{
        ...context.args,
        adding,
        onStartAdd: () => setAdding(true),
        onCancelAdd: () => setAdding(false),
        onAssign: (v) => { void v; setAdding(false) },
        onCreate: (n) => { void n; setAdding(false) },
        onRemove: noop,
      }}
    />
  )
}

const TAGS = [
  { value: 'frontend', label: 'frontend', color: 'blue' },
  { value: 'bug', label: 'bug', color: 'red' },
  { value: 'enhancement', label: 'enhancement', color: 'green' },
]

const OPTIONS = [
  { value: 'frontend', label: 'frontend', color: 'blue', meta: '12×' },
  { value: 'bug', label: 'bug', color: 'red', meta: '8×' },
  { value: 'enhancement', label: 'enhancement', color: 'green', meta: '5×' },
  { value: 'backend', label: 'backend', color: 'peach', meta: '9×' },
  { value: 'docs', label: 'docs', color: 'teal', meta: '3×' },
  { value: 'refactor', label: 'refactor', color: 'mauve', meta: '4×' },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/EntityTags',
  component: EntityTags,
  tags: ['status:stable', 'qa_behavioral:open', 'entity-detail', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    allowCreate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    tone: { control: 'select', options: ['crust', 'mantle', 'base', 'surface0'] },
    bordered: { control: 'boolean' },
  },
  args: {
    title: 'Tags',
    tags: TAGS,
    options: OPTIONS,
    allowCreate: true,
    disabled: false,
    tone: 'base',
    bordered: false,
  },
}
export default meta

// Default: drei zugewiesene Tags (entfernbare Chips) + Pencil-IconButton für Zuweis-Toggle.
// State (adding) lives in WithAddingState decorator — render stays inline for args-visibility.
export const Default = {
  decorators: [WithAddingState],
  args: { tags: [], options: [] },
  render: (args) => (
    <div data-ui="organism.entity-tags.default" className="max-w-xl">
      <EntityTags {...args} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — drei zugewiesene Tags (entfernbare Chips) + Zuweis-Toggle.
export const Main = {
  decorators: [WithAddingState],
  render: (args) => (
    <div data-ui="organism.entity-tags.main" className="max-w-xl">
      <EntityTags {...args} />
    </div>
  ),
}

// Variant_Adding: Pencil wurde geklickt → Multi-Select sichtbar (controlled adding=true).
export const Variant_Adding = {
  render: () => (
    <div data-ui="organism.entity-tags.adding" className="max-w-xl">
      <EntityTags
        tags={TAGS}
        options={OPTIONS}
        adding={true}
        onStartAdd={noop}
        onCancelAdd={noop}
        onRemove={noop}
        onAssign={noop}
        onCreate={noop}
      />
    </div>
  ),
}

// State_Empty: keine Tags zugewiesen → Platzhalter + Pencil-IconButton.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.entity-tags.empty" className="max-w-xl">
      <EntityTags
        tags={[]}
        options={OPTIONS}
        onStartAdd={noop}
        onRemove={noop}
        onAssign={noop}
        onCreate={noop}
      />
    </div>
  ),
}

// State_ReadOnly: zugewiesene Tags ohne Entfernen-Affordanz; kein Add-Control.
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.entity-tags.read-only" className="max-w-xl">
      <EntityTags title="Tags (read-only)" tags={TAGS} options={OPTIONS} allowCreate={false} />
    </div>
  ),
}

// Variant_Compact: borderless, kein Titel, padding=none — für Inline-Einbettung in andere Organismen.
// Breite durch Container bestimmt (kein max-w auf der Komponente).
export const Variant_Compact = {
  render: () => (
    <div data-ui="organism.entity-tags.compact" className="w-80">
      <EntityTags
        tags={TAGS}
        options={OPTIONS}
        bordered={false}
        showTitle={false}
        padding="none"
        compact={true}
        onStartAdd={noop}
        onCancelAdd={noop}
        onRemove={noop}
        onAssign={noop}
        onCreate={noop}
      />
    </div>
  ),
}
