/**
 * Section — betitelter Reintext-Abschnitt. Achse: label + Textlänge.
 * Reine Komposition (Label + children). 0 inline / 0 Hex.
 */
import Section from './Section.jsx'

const meta = {
  title: '03 MOLECULES/Section',
  component: Section,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    children: { control: 'text' },
  },
  args: {
    label: 'Beschreibung',
    children: 'Das Frontend wird aus dem Storybook-Katalog neu zusammengesetzt — presentational zuerst, dann promoten.',
  },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <Section {...args} dataUiScope="molecule.section.default" />
    </div>
  ),
}

// Mehrere Abschnitte gestapelt (Goal / Background / Description).
export const Stack = {
  render: () => (
    <div data-ui="molecule.section.stack" className="flex flex-col gap-[var(--space-4)] max-w-md">
      <Section label="Goal" dataUiScope="molecule.section.goal">Acht Molecule-Bauteile token-sauber liefern.</Section>
      <Section label="Background" dataUiScope="molecule.section.bg">Storybook ist Design-Wahrheit und Bauquelle zugleich.</Section>
      <Section label="Description" dataUiScope="molecule.section.desc">Je Komponente ein Triple aus jsx, stories und mdx, flach in molecules.</Section>
    </div>
  ),
}
