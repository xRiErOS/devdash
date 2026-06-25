/**
 * GF-329/GF-T4.5 — UserStoriesWidget (W3, 05.30 Widgets). Prüfinstanz-Liste eines Issues
 * (Konkretisierung §4.7, D06): je UserStory Titel/Details/QA-Kriterien + Verdikt-Badge
 * {open,accepted,rejected} (Terminal-Tint) + Fortschritt n/total akzeptiert. Terminal/DoD-
 * Rework (PO-#4.5): transparenter Card-Hintergrund, ghost Plus-Create-IconButton (öffnet
 * UserStoryForm-Modal) statt Inline-Add-Form, Filter-SegmentedControl (Aktuell=nur offen /
 * Alle). Review = Verdikt-Toggle accept/reject (PO-exklusiv). Controlled/präsentational.
 *
 * data-ui je Story-Wrapper UND je Item/Affordanz (PO spricht jedes 1:1 an).
 */
import { fn, expect, userEvent } from 'storybook/test'
import UserStoriesWidget from '../../../components/ui/organisms/UserStoriesWidget.jsx'

const noop = () => {}

const STORIES = [
  {
    key: 'us1',
    title: 'Tastatur-Navigation der Issue-Liste',
    details: 'Als Power-User will ich die Liste per Pfeiltasten durchlaufen und mit Enter das Detail öffnen.',
    qa: 'Pfeil hoch/runter bewegt die Auswahl; Enter öffnet das Detail; der Fokus ist sichtbar.',
    verdict: 'accepted',
  },
  {
    key: 'us2',
    title: 'Statusfilter per Tastenkürzel',
    details: 'Als Nutzer will ich Status schnell per Kürzel filtern, ohne zur Maus zu greifen.',
    qa: 'Taste 1–5 setzt den jeweiligen Statusfilter; Esc setzt zurück.',
    verdict: 'accepted',
  },
  {
    key: 'us3',
    title: 'Mehrfachauswahl von Issues',
    details: 'Als Nutzer will ich mehrere Issues markieren, um sie gebündelt zu verschieben.',
    qa: 'Shift-Klick wählt einen Bereich; ausgewählte Issues sind hervorgehoben.',
    verdict: 'open',
  },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/UserStoriesWidget',
  component: UserStoriesWidget,
  tags: ['status:stable', 'qa_behavioral:done', 'entity-detail', 'design_version:v2'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    reviewMode: { control: 'boolean', description: 'Review-Kontext: Verdikt-Toggle accept/reject sichtbar (PO-exklusiv).' },
    filterDefault: { control: 'inline-radio', options: ['open', 'all'], description: 'Start-Filter (Aktuell=open | Alle=all).' },
    disabled: { control: 'boolean' },
    tone: { control: 'select', options: ['crust', 'mantle', 'base', 'surface0', 'transparent'] },
    bordered: { control: 'boolean' },
  },
  args: {
    title: 'User Stories',
    stories: STORIES,
    reviewMode: false,
    filterDefault: 'all',
    disabled: false,
    tone: 'transparent',
    bordered: false,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — keine Stories, keine Affordanzen (Default != Main).
export const Default = {
  args: { title: undefined, stories: [] },
  render: (args) => (
    <div data-ui="organism.user-stories.default" className="max-w-2xl">
      <UserStoriesWidget {...args} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Refinement-Kontext mit voller Story-Liste (Alle-Filter) + CRUD.
export const Main = {
  render: () => (
    <div data-ui="organism.user-stories.main" className="max-w-2xl">
      <UserStoriesWidget title="User Stories" stories={STORIES} filterDefault="all" onEdit={noop} onRemove={noop} onAdd={noop} />
    </div>
  ),
}

// Variant_Review: Review-Kontext — Verdikt-Toggle accept/reject je Story (PO-exklusiv); kein CRUD.
export const Variant_Review = {
  render: () => (
    <div data-ui="organism.user-stories.review" className="max-w-2xl">
      <UserStoriesWidget title="User Stories — Review" stories={STORIES} filterDefault="all" reviewMode onVerdict={noop} />
    </div>
  ),
}

// State_ReadOnly: reine Anzeige — keine Affordanzen.
export const State_ReadOnly = {
  render: () => (
    <div data-ui="organism.user-stories.read-only" className="max-w-2xl">
      <UserStoriesWidget title="User Stories (read-only)" stories={STORIES} filterDefault="all" />
    </div>
  ),
}

// State_Empty: keine Stories → Platzhalter + Create-Icon (Refinement-Start).
export const State_Empty = {
  render: () => (
    <div data-ui="organism.user-stories.empty" className="max-w-2xl">
      <UserStoriesWidget stories={[]} onAdd={noop} />
    </div>
  ),
}

// Variant_FilterAktuell: Default-Filter Aktuell → nur offene Stories (akzeptiert/abgelehnt gefiltert).
export const Variant_FilterAktuell = {
  render: () => (
    <div data-ui="organism.user-stories.filter-aktuell" className="max-w-2xl">
      <UserStoriesWidget title="User Stories — Aktuell" stories={STORIES} onEdit={noop} onRemove={noop} onAdd={noop} />
    </div>
  ),
}

// Variant_Headless: titellos (showTitle=false) für IssueDetails-Slot-Einbettung — der
// AccordionBody-Slot stellt den Titel via CommentLabel (Terminal-Konvention). Randlos
// (Default tone=transparent), nur Daten + Progress. Verdrahtungsfall der Voll-Komposition.
export const Variant_Headless = {
  render: () => (
    <div data-ui="organism.user-stories.headless" className="max-w-2xl">
      <UserStoriesWidget stories={STORIES} showTitle={false} filterDefault="all" tone="mantle" />
    </div>
  ),
}

// Variant_ReviewReadonly (GF-2 T4): Review-Screen-Pruefgrundlage — US-Rows read-only, je Row
// ein Info-Overlay (Akzeptanzkriterien), KEINE per-US-Verdict/Edit/Remove-Affordanzen (Verdict
// ist issue-level, D01). displayMode='review-readonly'.
export const Variant_ReviewReadonly = {
  render: () => (
    <div data-ui="organism.user-stories.review-readonly" className="max-w-2xl">
      <UserStoriesWidget title="User Stories — Pruefgrundlage" stories={STORIES} filterDefault="all" displayMode="review-readonly" />
    </div>
  ),
}

// Interaction_OpenCreate (Gleis 2): Klick auf den Plus-Create-Icon öffnet das UserStoryForm-
// Create-Modal (Titel-Input erscheint, kein Verdikt-Control).
export const Interaction_OpenCreate = {
  render: () => (
    <div data-ui="organism.user-stories.open-create" className="max-w-2xl">
      <UserStoriesWidget title="User Stories" stories={STORIES} filterDefault="all" onAdd={fn()} />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('User Story erfassen'))
    const dialog = await canvas.findByRole('dialog')
    await expect(dialog).toBeInTheDocument()
    await expect(canvas.getByLabelText('User-Story-Titel')).toBeInTheDocument()
    await expect(canvas.queryByRole('radiogroup', { name: 'Verdikt' })).not.toBeInTheDocument()
  },
}
