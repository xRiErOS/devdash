/**
 * Breadcrumb — Pfad-Anzeige mit Prompt-Zeichen. Achse: Segmentzahl, last, kind.
 * Optional Komposition mit EntityId (kind). 0 inline / 0 Hex.
 */
import Breadcrumb from './Breadcrumb.jsx'

const meta = {
  title: '03 MOLECULES/Breadcrumb',
  component: Breadcrumb,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    segments: { control: 'object' },
  },
  args: {
    segments: [
      { label: 'devd2' },
      { label: 'DD#49' },
      { label: 'DD2-7', last: true },
    ],
  },
}
export default meta

export const Default = {
  render: (args) => <Breadcrumb {...args} dataUiScope="molecule.breadcrumb.default" />,
}

// Mit farbcodierten Entitäts-Segmenten (kind → EntityId).
export const EntityColored = {
  render: () => (
    <Breadcrumb
      dataUiScope="molecule.breadcrumb.entity"
      segments={[
        { label: 'devd2' },
        { label: 'DD#49', kind: 'sprint' },
        { label: 'DD2-7', kind: 'issue', last: true },
      ]}
    />
  ),
}
