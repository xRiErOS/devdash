/**
 * MetaGrid — zweispaltige Detail-Tabelle. Achse: rows.
 * Reine Komposition (Label/Wert-Paare). 0 inline / 0 Hex.
 */
import MetaGrid from './MetaGrid.jsx'

const meta = {
  title: '03 MOLECULES/MetaGrid',
  component: MetaGrid,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    rows: { control: 'object' },
  },
  args: {
    rows: [
      { label: 'Status', value: 'In Arbeit' },
      { label: 'Priorität', value: 'Hoch' },
      { label: 'Sprint', value: 'DD#49' },
      { label: 'Typ', value: 'Feature' },
    ],
  },
}
export default meta

export const Default = {
  render: (args) => <MetaGrid {...args} dataUiScope="molecule.metaGrid.default" />,
}

// Kompakte Variante mit wenigen Zeilen.
export const Compact = {
  render: () => (
    <MetaGrid
      dataUiScope="molecule.metaGrid.compact"
      rows={[
        { label: 'Status', value: 'Refined' },
        { label: 'Typ', value: 'Chore' },
      ]}
    />
  ),
}
