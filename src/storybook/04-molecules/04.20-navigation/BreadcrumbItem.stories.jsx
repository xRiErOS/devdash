/**
 * GF-208-Muster — BreadcrumbItem (04.20 Navigation, GF-234). Molecule: Link-Atom
 * (Segment) bzw. aktuelles Text-Segment + Separator-Icon. Dumb (CONV-molecule-
 * boundary): präsentational, kein Routing-State. Icon aus foundations-Registry
 * (A2). data-ui je Story + je Element (T01).
 */
import BreadcrumbItem from '../../../components/ui/molecules/BreadcrumbItem.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const meta = {
  title: '04 MOLECULES/04.20 Navigation/BreadcrumbItem',
  component: BreadcrumbItem,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Label.' },
    href: { control: 'text' },
    current: { control: 'boolean', description: 'Aktuelles Segment (Text statt Link, aria-current).' },
    isLast: { control: 'boolean', description: 'Letztes Segment → kein Separator.' },
    icon: { control: false },
  },
  args: {
    children: 'Sprints',
    href: '#sprints',
    current: false,
    isLast: false,
  },
}
export default meta

// Default: args-getrieben — Controls steuern Label/href/current/isLast.
export const Default = {
  render: (args) => (
    <nav data-ui="molecule.breadcrumb-item.default" aria-label="Breadcrumb">
      <BreadcrumbItem {...args} />
    </nav>
  ),
}

// Main = vollständiger Pfad mit führendem Icon am Root + aktuellem letzten
// Segment (maßgeblicher realistischer Hauptfall).
export const Main = {
  render: () => (
    <nav data-ui="molecule.breadcrumb-item.composition" aria-label="Breadcrumb" className="inline-flex items-center">
      <BreadcrumbItem data-ui="molecule.breadcrumb-item.root" href="#home" icon={<Icon name="home" mono size={14} />}>Home</BreadcrumbItem>
      <BreadcrumbItem data-ui="molecule.breadcrumb-item.sprints" href="#sprints">Sprints</BreadcrumbItem>
      <BreadcrumbItem data-ui="molecule.breadcrumb-item.current" current isLast>DD-1 · Mobile UX</BreadcrumbItem>
    </nav>
  ),
}

// Variant_States = verlinktes Segment (mit Separator) vs. aktuelles Segment
// (letztes, ohne Separator). Jede Achse mit eigenem data-ui.
export const Variant_States = {
  render: () => (
    <nav data-ui="molecule.breadcrumb-item.states" aria-label="Breadcrumb" className="inline-flex items-center">
      <span data-ui="molecule.breadcrumb-item.link-segment">
        <BreadcrumbItem href="#sprints">Sprints</BreadcrumbItem>
      </span>
      <span data-ui="molecule.breadcrumb-item.current-segment">
        <BreadcrumbItem current isLast>DD-1</BreadcrumbItem>
      </span>
    </nav>
  ),
}
