/**
 * GF-245-Muster — EntityItem (05.10 Lists, OR-06, D04). Kanonische Listen-Zeile/
 * -Karte für alle Entity-Typen. PO-Review Round 1 eingearbeitet (EI-1..11, SZ-1):
 * StatusBadgeSelect (EI-6), Disclosure-Chevron im Head (EI-7/8), surface filled|bare
 * (EI-9/10), Select-Mode (EI-2), Progress nur wo sinnvoll (EI-4), size (SZ-1).
 *
 * Ebene-6 (OR-06): CAP-project-archive 🟢, CAP-tag-update 🟡 — Aktionen kommen als
 * action-data vom ListView. data-ui je Wrapper + Element.
 */
import EntityItem from '../../../components/ui/organisms/EntityItem.jsx'

const noop = () => {}
const ALLOWED = ['active', 'review', 'done', 'cancelled']

const SubtaskList = () => (
  <ul className="list-disc ps-5">
    <li>Ref-Test schreiben</li>
    <li>Component bauen</li>
    <li>Story + MDX</li>
  </ul>
)

const meta = {
  title: '05 ORGANISMS/05.10 Lists/EntityItem',
  component: EntityItem,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    id: { control: 'text' },
    name: { control: 'text' },
    entity: { control: 'select', options: ['issue', 'sprint', 'milestone', 'dod', 'todo', 'neutral'] },
    layout: { control: 'inline-radio', options: ['card', 'row'] },
    surface: { control: 'inline-radio', options: ['filled', 'bare'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    status: { control: 'select', options: ['new', 'active', 'review', 'done', 'cancelled'] },
    selectable: { control: 'boolean' },
    selected: { control: 'boolean' },
    expanded: { control: 'boolean' },
    dragging: { control: 'boolean' },
    draggable: { control: 'boolean' },
  },
  args: {
    id: 'DD-42',
    name: 'Filter-Overlay verdrahten',
    entity: 'issue',
    layout: 'card',
    surface: 'filled',
    size: 'md',
    status: 'active',
    allowedStatuses: ALLOWED,
    selectable: false,
    selected: false,
    expanded: false,
    dragging: false,
    draggable: true,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (no-args, nur strukturell nötige Identität),
// ohne Children/Status → bewusst inhaltlich != Main (Gate Default != Main).
export const Default = {
  args: {
    id: undefined,
    name: undefined,
    entity: 'neutral',
    layout: undefined,
    surface: undefined,
    size: undefined,
    status: undefined,
    allowedStatuses: undefined,
    selectable: undefined,
    selected: undefined,
    expanded: undefined,
    dragging: undefined,
    draggable: undefined,
  },
  render: (args) => (
    <div data-ui="organism.entity-item.default" className="max-w-2xl">
      <EntityItem {...args} />
    </div>
  ),
}

// Main: maßgeblich genutzte Gestalt — voll befüllter args-getriebener Hauptfall mit
// Children → Disclosure-Chevron (EI-7), interaktivem Status, vollem Demo-Inhalt.
export const Main = {
  render: (args) => (
    <div data-ui="organism.entity-item.main" className="max-w-2xl">
      <EntityItem {...args} onSelectChange={noop} onToggleExpand={noop} onStatusChange={noop}>
        <SubtaskList />
      </EntityItem>
    </div>
  ),
}

// Variants (EI-1): Meilenstein/Sprint/Issue/DoD/ToDo. Progress nur bei Sprint/
// Milestone (EI-4); Issue/DoD/ToDo tragen Status bzw. nur Identität.
export const Variant_All = {
  render: () => (
    <div data-ui="organism.entity-item.variants" className="flex flex-col gap-3 max-w-2xl">
      <div data-ui="organism.entity-item.type-milestone">
        <EntityItem id="M1" name="Milestone — Frontend-Rework" entity="milestone" status="active" allowedStatuses={ALLOWED} progress={{ value: 5, max: 8 }} onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.type-sprint">
        <EntityItem id="DD#34" name="Sprint — Organismen" entity="sprint" status="review" allowedStatuses={ALLOWED} progress={{ value: 6, max: 7 }} onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.type-issue">
        <EntityItem id="DD-42" name="Issue — Filter-Overlay" entity="issue" status="active" allowedStatuses={ALLOWED} onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.type-dod">
        <EntityItem id="DoD-3" name="DoD — Tests grün" entity="dod" draggable={false} />
      </div>
      <div data-ui="organism.entity-item.type-todo">
        <EntityItem id="T-7" name="ToDo — Doku ergänzen" entity="todo" draggable={false} />
      </div>
    </div>
  ),
}

// Appearance (EI-9/10): card filled (Rahmen+Fläche) · card bare (nur Rahmen) · row.
export const Variant_Appearance = {
  render: () => (
    <div data-ui="organism.entity-item.appearance" className="flex flex-col gap-4 max-w-2xl">
      <div data-ui="organism.entity-item.surface-filled">
        <EntityItem id="DD-50" name="Card · filled" entity="issue" status="active" allowedStatuses={ALLOWED} layout="card" surface="filled" onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.surface-bare">
        <EntityItem id="DD-51" name="Card · bare (nur Rahmen)" entity="issue" status="active" allowedStatuses={ALLOWED} layout="card" surface="bare" onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.layout-row" className="rounded-md border border-[var(--surface1)]">
        <EntityItem id="DD-52" name="Row-Layout" entity="issue" status="review" allowedStatuses={ALLOWED} layout="row" onStatusChange={noop} />
      </div>
    </div>
  ),
}

// Sizes (SZ-1): sm/md/lg/xl skalieren Padding + Progress-Breite.
export const Variant_Sizes = {
  render: () => (
    <div data-ui="organism.entity-item.sizes" className="flex flex-col gap-3 max-w-2xl">
      {['sm', 'md', 'lg', 'xl'].map((s) => (
        <div key={s} data-ui={`organism.entity-item.size-${s}`}>
          <EntityItem id={`DD-${s}`} name={`Size ${s}`} entity="sprint" status="active" allowedStatuses={ALLOWED} size={s} progress={{ value: 3, max: 6 }} onStatusChange={noop} />
        </div>
      ))}
    </div>
  ),
}

// States: selected · expanded (Children) · dragging · select-mode (Checkbox, EI-2).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.entity-item.states" className="flex flex-col gap-4 max-w-2xl">
      <div data-ui="organism.entity-item.state-selectmode">
        <EntityItem id="DD-60" name="Select-Mode (Checkbox sichtbar)" entity="issue" status="active" allowedStatuses={ALLOWED} selectable onSelectChange={noop} onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.state-selected">
        <EntityItem id="DD-61" name="Selektiert" entity="issue" status="active" allowedStatuses={ALLOWED} selectable selected onSelectChange={noop} onStatusChange={noop} />
      </div>
      <div data-ui="organism.entity-item.state-expanded">
        <EntityItem id="DD-62" name="Aufgeklappt" entity="issue" status="active" allowedStatuses={ALLOWED} expanded onToggleExpand={noop} onStatusChange={noop}>
          <SubtaskList />
        </EntityItem>
      </div>
      <div data-ui="organism.entity-item.state-dragging">
        <EntityItem id="DD-63" name="Wird gezogen" entity="issue" status="new" allowedStatuses={ALLOWED} dragging onStatusChange={noop} />
      </div>
    </div>
  ),
}

// Composition: Karte mit Drag-Handle, Disclosure (Children), Progress (Sprint) und
// interaktivem Status — das volle Element-Set für die PO-Abnahme.
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.entity-item.composition" className="max-w-2xl">
      <EntityItem
        id="DD#35"
        name="Sprint mit Unteraufgaben"
        entity="sprint"
        status="active"
        allowedStatuses={ALLOWED}
        progress={{ value: 2, max: 5 }}
        selectable
        expanded
        onToggleExpand={noop}
        onSelectChange={noop}
        onStatusChange={noop}
        childrenLabel="Stories (3)"
      >
        <SubtaskList />
      </EntityItem>
    </div>
  ),
}
