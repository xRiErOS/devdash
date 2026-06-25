import PageTitle from '../../../components/ui/atoms/PageTitle.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const meta = {
  title: '03 ATOMS/03.20 Display/PageTitle',
  component: PageTitle,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Titeltext/-Knoten' },
    suffix: { control: 'text', description: 'Optionaler gemuteter Suffix (z.B. ` · slug`)' },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3'],
      description: 'Heading-Element (Default: h1)',
    },
    className: { control: 'text', description: 'Zusätzliche Klassen (Spacing etc.)' },
  },
  args: {
    children: 'Backlog',
  },
}
export default meta

// Default: args-getrieben — Controls-Panel steuert alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.page-title.default">
      <PageTitle {...args} />
    </div>
  ),
}

// Variants: mit und ohne Icon, mit Suffix
export const Variants = {
  render: () => (
    <div data-ui="atom.page-title.variants" className="flex flex-col gap-4">
      <div data-ui="atom.page-title.plain">
        <PageTitle>Backlog</PageTitle>
      </div>
      <div data-ui="atom.page-title.with-icon">
        <PageTitle leadingIcon={<Icon name="backlog" size={20} role="neutral" />}>Backlog</PageTitle>
      </div>
      <div data-ui="atom.page-title.with-suffix">
        <PageTitle suffix=" · devd">DevDash - Roadmap</PageTitle>
      </div>
    </div>
  ),
}

// Composition: leadingIcon + suffix kombiniert
export const Composition = {
  render: () => (
    <div data-ui="atom.page-title.composition" className="flex flex-col gap-4">
      <div data-ui="atom.page-title.composition-icon-suffix">
        <PageTitle
          leadingIcon={<Icon name="backlog" size={20} role="neutral" />}
          suffix=" · devd"
        >
          DevDash - Roadmap
        </PageTitle>
      </div>
    </div>
  ),
}
