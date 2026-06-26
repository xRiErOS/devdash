/**
 * ElementList — Listen-Organismus (Spec §4/§7). Achsen: flat vs. nested,
 * Selektion/Expand, EmptyState-Varianten.
 */
import ElementList from './ElementList.jsx'
import { FLAT_ISSUES, NESTED_TREE } from '../../foundations/fixtures/elementBrowser.demo.js'

const meta = {
  title: '04 ORGANISMS/ElementList',
  component: ElementList,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => (
  <div data-ui="organism.elementList.story" className="h-[480px] w-[680px] bg-[var(--base)]">{children}</div>
)

export const Flat = {
  render: () => (
    <Frame>
      <ElementList items={FLAT_ISSUES} selectedIds={['i1', 'i2']} activeId="i1" className="h-full" />
    </Frame>
  ),
}

export const Nested = {
  render: () => (
    <Frame>
      <ElementList items={NESTED_TREE} expandedIds={['m1', 's1']} className="h-full" />
    </Frame>
  ),
}

export const Empty = {
  render: () => (
    <Frame>
      <ElementList items={[]} empty="empty" className="h-full" />
    </Frame>
  ),
}

export const NoMatch = {
  render: () => (
    <Frame>
      <ElementList items={[]} empty="no-match" className="h-full" />
    </Frame>
  ),
}
