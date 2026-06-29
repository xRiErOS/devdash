/**
 * BrowserToolbar — Kopfzeile (Spec §3). Achsen: aktive Filter (FilterBar),
 * FilterMenu-Popover offen/zu.
 */
import BrowserToolbar from './BrowserToolbar.jsx'
import FilterMenu from './FilterMenu.jsx'
import { ACTIVE_FILTERS } from '../../foundations/fixtures/elementBrowser.demo.js'

const STATUSES = [
  { key: 'new', label: 'Neu' },
  { key: 'in_progress', label: 'In Arbeit' },
  { key: 'completed', label: 'Abgeschlossen' },
]
const SPRINTS = [{ key: 'dd49', label: 'DD2#49' }, { key: 'dd50', label: 'DD2#50' }]

const menu = <FilterMenu statuses={STATUSES} sprints={SPRINTS} dataUiScope="organism.browserToolbar.story.menu" />

const meta = {
  title: '04 ORGANISMS/BrowserToolbar',
  component: BrowserToolbar,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => (
  <div data-ui="organism.browserToolbar.story" className="w-[820px] bg-[var(--base)] pb-[320px]">{children}</div>
)

export const Default = {
  render: () => (
    <Frame>
      <BrowserToolbar query="" sort="title" />
    </Frame>
  ),
}

export const WithActiveFilters = {
  render: () => (
    <Frame>
      <BrowserToolbar query="capture" sort="priority" activeFilters={ACTIVE_FILTERS} />
    </Frame>
  ),
}

export const FilterOpen = {
  render: () => (
    <Frame>
      <BrowserToolbar query="" sort="title" activeFilters={ACTIVE_FILTERS} filterOpen filterMenu={menu} />
    </Frame>
  ),
}
