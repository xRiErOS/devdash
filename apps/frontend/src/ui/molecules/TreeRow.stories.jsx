/**
 * TreeRow — Hierarchie-Zeile. Achsen: indent, caret, idKind, active.
 * Komponiert EntityId (ID). 0 inline / 0 Hex.
 */
import TreeRow from './TreeRow.jsx'

const meta = {
  title: '03 MOLECULES/TreeRow',
  component: TreeRow,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    indent: { control: 'inline-radio', options: [0, 1, 2] },
    caret: { control: 'inline-radio', options: ['open', 'closed', 'none'] },
    idKind: { control: 'inline-radio', options: ['issue', 'sprint', 'milestone'] },
    active: { control: 'boolean' },
  },
  args: { indent: 0, caret: 'open', id: 'M2', idKind: 'milestone', lead: 'Frontend-Strangler', active: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="max-w-md">
      <TreeRow {...args} dataUiScope="molecule.treeRow.default" />
    </div>
  ),
}

// Milestone → Sprint → Issue (verschiedene indents/kinds, eine active).
export const Hierarchy = {
  render: () => (
    <div data-ui="molecule.treeRow.hierarchy" className="flex flex-col max-w-md">
      <TreeRow indent={0} caret="open" id="M2" idKind="milestone" lead="Frontend-Strangler" dataUiScope="molecule.treeRow.m" />
      <TreeRow indent={1} caret="open" id="DD#49" idKind="sprint" lead="Molecules" dataUiScope="molecule.treeRow.s" />
      <TreeRow indent={2} caret="none" id="DD2-7" idKind="issue" label="8 Molecule-Bauteile" active dataUiScope="molecule.treeRow.i" />
    </div>
  ),
}
