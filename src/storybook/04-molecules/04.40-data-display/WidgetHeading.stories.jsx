import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'
import WidgetHeading from '../../../components/ui/molecules/WidgetHeading.jsx'

const meta = {
  title: '04 MOLECULES/04.40 Data-Display/WidgetHeading',
  component: WidgetHeading,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  // additiver Wrapper-Anker je Story (WidgetHeading setzt selbst `widget-heading`, §3)
  render: (args, ctx) => (
    <div data-ui={`molecule.widget-heading.${(ctx?.name || 'default').replace(/_/g, '-').toLowerCase()}`}>
      <WidgetHeading {...args} />
    </div>
  ),
}
export default meta

const actions = (
  <>
    <Icon name="edit" size={15} className="cursor-pointer hover:text-[var(--text)]" />
    <Icon name="copy" size={15} className="cursor-pointer hover:text-[var(--text)]" />
    <Icon name="delete" role="neutral" size={15} className="cursor-pointer hover:text-[var(--text)]" />
  </>
)

// Default = nur Heading (Dot + Titel).
export const Default = { args: { heading: 'Beschreibung' } }

// Main = mit hover-reveal Action-Trio (Pencil/Copy/Trash). Wrapper trägt `group` (sonst kein Reveal).
export const Main = {
  args: { heading: 'Beschreibung', action: actions },
  decorators: [(Story) => <div className="group">{Story()}</div>],
}
