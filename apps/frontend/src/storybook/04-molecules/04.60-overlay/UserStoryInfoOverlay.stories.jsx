import UserStoryInfoOverlay from '../../../components/ui/molecules/UserStoryInfoOverlay.jsx'

const meta = {
  title: '04 MOLECULES/04.60 Overlay/UserStoryInfoOverlay',
  component: UserStoryInfoOverlay,
  // #7-Rework: absolute Popover -> zentriertes Modal mit allen US-Feldern. PO-Visual-Review 2026-06-23 -> status:stable.
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  // additiver Wrapper-Anker je Story (Component setzt selbst `sprint-review.panel.us-info`, §3)
  render: (args, ctx) => (
    <div data-ui={`molecule.user-story-info-overlay.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`}>
      <UserStoryInfoOverlay {...args} />
    </div>
  ),
}
export default meta

const STORY = {
  storyKey: 'US-1',
  title: 'Projekt wechseln',
  details: 'Als Nutzer will ich das aktive Projekt wechseln, damit alle Listen nur dessen Daten zeigen.',
  qa: 'Wechsel auf Projekt B → alle Listen zeigen nur B-Daten; Reload behält B.',
}

export const Default = { args: { ...STORY } }

// Main (gf-tier-story-names Pflicht): maßgeblicher Hauptfall = geöffnetes Modal mit allen Feldern.
export const Main = { args: { ...STORY, open: true } }
