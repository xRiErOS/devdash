/**
 * DocstringBlock — Atom-Story (03.20 Display). Goal/Beschreibung als `""" … """`
 * mit Akzent-Linksrule (EntityDetail V2). data-ui je Variante.
 */
import DocstringBlock from '../../../components/ui/atoms/DocstringBlock.jsx'

const meta = {
  title: '03 ATOMS/03.20 Display/DocstringBlock',
  component: DocstringBlock,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: { children: { control: 'text' } },
  args: { children: 'Verdichtete Metadaten einer Entität — Goal, Status und Kerndaten auf einen Blick.' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.docstring-block.default" className="max-w-xl"><DocstringBlock {...args} /></div>
  ),
}

// Composition: Goal-Block in einem Datei-Kopf-Kontext.
export const Composition = {
  render: () => (
    <div data-ui="atom.docstring-block.composition" className="max-w-xl rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--surface0)]">
      <DocstringBlock>Issue-Goal: MetaCardWidget als wiederverwendbares Detail-Element ohne Edit-Last im Header.</DocstringBlock>
    </div>
  ),
}
