/**
 * IssueRow (05.10 Lists) — kanonische kompakte Backlog-Zeile. GF-2-Insel-Story
 * (Archiv-Extraktion aus `90 Archive/Organisms/Backlog/IssueRow`, Canon-R12
 * move + git rm Twin). Baustein des getrimmten BacklogPage-SOLL
 * (project_memory GF2-BACKLOG-SCOPE).
 *
 * PRESENTATIONAL: props-driven, alle Interaktion (open/multi/status) via Callback
 * nach oben delegiert — keine eigene Mutation. data-ui je Wrapper + Element
 * (Komponente trägt `issue-row.*` via dataUiScope-Default).
 *
 * Gleis-2 (Interaction_OpenVsMulti): Plain-Klick → onOpen; Cmd/Ctrl+Klick →
 * onToggleMulti (Multi-Select-Branch in der Komponente).
 */
import { fn } from 'storybook/test'
import { expect, userEvent, within } from 'storybook/test'
import IssueRow from '../../../components/ui/organisms/IssueRow.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'

const TAGS = [
  { id: 1, name: 'frontend', color: 'blue' },
  { id: 2, name: 'token-clean', color: 'green' },
  { id: 3, name: 'urgent', color: 'red' },
]

const MAIN_ITEM = {
  id: 137,
  project_prefix: 'DD',
  project_number: 137,
  title: 'Backlog-Row aus BacklogPage extrahieren',
  type: 'refactor',
  status: 'refined',
  priority: 2,
  tags: TAGS,
}

const SPRINT = { id: 20, key: 'DD#20', name: 'Frontend-Rework Phase 3' }

// PO-Review B02: Canvas-Validierung der Surface-Elevation (01.15). Der Decorator
// legt einen wählbaren Layer-Panel HINTER die Row, damit der PO im Controls-Panel
// durch die Rollen-Leiter (--layer-N) toggeln und den Ruhe-/Selected-/Active-
// Kontrast direkt im Storybook prüfen kann. Live-Default = base (= Listen-Panel
// im MasterDetailScreen, sidebarSurface='base'). Statische Klassen → JIT-sichtbar.
const BG_MAP = {
  'base (live: Listen-Panel)': 'bg-[var(--layer-bg)]',
  'surface0 (layer-3 Content-Panel)': 'bg-[var(--layer-3)]',
  'surface1 (layer-4 Feld)': 'bg-[var(--layer-4)]',
  'mantle (layer-1 Chrome)': 'bg-[var(--layer-1)]',
  'crust (layer-2 Wrapper)': 'bg-[var(--layer-2)]',
}
const BG_DEFAULT = 'base (live: Listen-Panel)'

const meta = {
  title: '05 ORGANISMS/05.10 Lists/IssueRow',
  component: IssueRow,
  tags: ['status:stable', 'qa_checklist:open', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  // Decorator ohne data-ui (kein Distinctness-/Unique-Gate-Bezug): farbiger
  // Layer-Panel hinter der jeweiligen Story-Render-Hülle.
  decorators: [
    (Story, { args }) => (
      <div className={`${BG_MAP[args.colorBackground] || BG_MAP[BG_DEFAULT]} rounded-lg p-3`}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    search: { control: 'text' },
    isLast: { control: 'boolean' },
    multiSelected: { control: 'boolean' },
    wrapOnMobile: { control: 'boolean' },
    colorBackground: { name: 'Canvas (Surface-Elevation)', control: 'select', options: Object.keys(BG_MAP) },
    restTone: { name: 'Ruhe-Fill der Zeile', control: 'select', options: ['transparent', 'base', 'layer-1', 'layer-2', 'layer-3', 'layer-4'] },
  },
  args: {
    item: MAIN_ITEM,
    search: '',
    isLast: false,
    multiSelected: false,
    wrapOnMobile: false,
    colorBackground: BG_DEFAULT,
    restTone: 'transparent',
    onOpen: fn(),
    onToggleMulti: fn(),
    onStatusChange: fn(),
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — nur Identität, keine Tags/Sprint/
// Suche → bewusst inhaltlich != Main (Gate Default != Main).
export const Default = {
  args: {
    item: { id: 1, project_prefix: 'DD', project_number: 1, title: 'Issue-Zeile', type: 'feature', status: 'new', priority: 3 },
    sprint: {}
  },
  render: (args) => (
    <div data-ui="organism.issue-row.default" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
}

// Main: maßgeblich genutzte Gestalt — voll befüllt (Tags, Sprint, refined),
// alle Callbacks gesetzt.
export const Main = {
  args: { item: MAIN_ITEM, sprint: SPRINT },
  render: (args) => (
    <div data-ui="organism.issue-row.main" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
}

// Variant_NarrowLongSprint: DD-Review F1+Folge — schmale Master-Liste (~26rem) +
// langer Sprint-Name. Sprint-Pill spannt col3+col4 rechtsbündig → trägt nicht zur
// col4-Track-Breite bei; der 1fr-Titel bleibt unabhängig von der Sprint-Präsenz
// gleich lang (vorher stahl der Sprint-Name Titelbreite → ausgehungert).
export const Variant_NarrowLongSprint = {
  args: {
    item: { ...MAIN_ITEM, title: 'Backlog-Liste anders gestalten und dennoch gut lesbar halten' },
    sprint: { id: 74, key: 'DD#74', name: 'Redesign Sprint Board Phase 2' },
  },
  render: (args) => (
    <div data-ui="organism.issue-row.narrow-long-sprint" className="w-[26rem]">
      <IssueRow {...args} />
    </div>
  ),
}

// Variant_SearchHighlight: Suchwort-Highlight im Titel.
export const Variant_SearchHighlight = {
  args: { search: 'Backlog' },
  render: (args) => (
    <div data-ui="organism.issue-row.search-highlight" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
}

// Variant_Priority: Border-Left-Skala 1..5 (--priority-1..5).
export const Variant_Priority = {
  render: (args) => (
    <div data-ui="organism.issue-row.priority" className="w-[640px]">
      {[1, 2, 3, 4, 5].map((p, i) => (
        <IssueRow
          key={p}
          {...args}
          item={{ ...MAIN_ITEM, id: p, project_number: p, title: `Priorität ${p}`, priority: p, tags: [] }}
          isLast={i === 4}
        />
      ))}
    </div>
  ),
}

// Variant_RefineSlot: frei einsetzbarer Row-Action-Slot (Parent liefert Button).
export const Variant_RefineSlot = {
  args: {
    item: { ...MAIN_ITEM, id: 300, project_number: 300, type: 'bug', status: 'new', priority: 3, tags: [] },
    refineSlot: <Button variant="ghost" size="sm" className="shrink-0">Refine</Button>,
  },
  render: (args) => (
    <div data-ui="organism.issue-row.refine-slot" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
}

// Variant_Composition: gerahmte Liste mehrerer Zeilen — volles Element-Set für
// die PO-Abnahme (Typ-Icons, Status-Badges, Border-Trenner).
export const Variant_Composition = {
  render: (args) => (
    <div data-ui="organism.issue-row.composition" className="w-[640px] rounded-lg border border-[var(--surface1)] overflow-hidden">
      {[
        { ...MAIN_ITEM, id: 1, project_number: 1, title: 'Feature anlegen', type: 'feature', status: 'planned', priority: 2 },
        { ...MAIN_ITEM, id: 2, project_number: 2, title: 'Bug im Status-Picker', type: 'bug', status: 'in_progress', priority: 1, tags: [TAGS[2]] },
        { ...MAIN_ITEM, id: 3, project_number: 3, title: 'Tokens vereinheitlichen', type: 'chore', status: 'done', priority: 4, tags: [] },
      ].map((item, i, arr) => (
        <IssueRow key={item.id} {...args} item={item} isLast={i === arr.length - 1} />
      ))}
    </div>
  ),
}

// State_Selected: Multi-Select-Hervorhebung (Cmd/Ctrl+Klick-Zustand).
export const State_Selected = {
  args: { multiSelected: true },
  render: (args) => (
    <div data-ui="organism.issue-row.state-selected" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
}

// Interaction_OpenVsMulti: Plain-Klick → onOpen(id); Cmd/Ctrl+Klick → onToggleMulti(id).
export const Interaction_OpenVsMulti = {
  args: { onOpen: fn(), onToggleMulti: fn() },
  render: (args) => (
    <div data-ui="organism.issue-row.interaction-open-multi" className="w-[640px]">
      <IssueRow {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const openBtn = canvas.getByText(MAIN_ITEM.title).closest('[role="button"]')
    await userEvent.click(openBtn)
    await expect(args.onOpen).toHaveBeenCalledWith(MAIN_ITEM.id)
    await userEvent.keyboard('{Meta>}')
    await userEvent.click(openBtn)
    await userEvent.keyboard('{/Meta}')
    await expect(args.onToggleMulti).toHaveBeenCalledWith(MAIN_ITEM.id)
  },
}
