/**
 * ElementBrowserScreen — Screen-Organismus (Spec §1–§3, §9).
 *
 * Presentational-Stories: alle Zustände als Props (Augenschein). Die `Connected`-
 * Story beweist die Prod-Integration: echter Fetch via `useElementBrowser` →
 * MSW-Handler (`ElementBrowser.handlers.js`) → Adapter (`lib/elementsApi`) →
 * Render, plus Bulk-Roundtrip (PATCH /api/backlog/bulk) per play-Function (Ebene-2).
 */
import { useState } from 'react'
import { within, userEvent, expect, waitFor, fn } from 'storybook/test'
import ElementBrowserScreen from './ElementBrowserScreen.jsx'
import { FLAT_ISSUES, NESTED_TREE, ACTIVE_FILTERS } from '../foundations/fixtures/elementBrowser.demo.js'
import { useElementBrowser } from '../../hooks/useElementBrowser.js'
import { elementBrowserHandlers } from './ElementBrowser.handlers.js'

const meta = {
  title: '05 SCREENS/ElementBrowser',
  component: ElementBrowserScreen,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Default = {
  render: () => <ElementBrowserScreen items={FLAT_ISSUES} />,
}

export const WithOpenPanel = {
  render: () => (
    <ElementBrowserScreen
      items={FLAT_ISSUES}
      preview={{ type: 'issue', data: { id: 'i1' }, size: 'default' }}
      activeFilters={ACTIVE_FILTERS}
    />
  ),
}

export const NestedMixed = {
  render: () => (
    <ElementBrowserScreen
      items={NESTED_TREE}
      expandedIds={['m1', 's1', 's2', 'm2', 's3']}
    />
  ),
}

export const BulkSelection = {
  render: () => (
    <ElementBrowserScreen items={FLAT_ISSUES} selectedIds={['i1', 'i2', 'i5']} />
  ),
}

export const EmptyProject = {
  render: () => <ElementBrowserScreen items={[]} empty="empty" />,
}

export const NoFilterMatch = {
  render: () => (
    <ElementBrowserScreen items={[]} empty="no-match" activeFilters={ACTIVE_FILTERS} />
  ),
}

export const CompactPanel = {
  render: () => (
    <ElementBrowserScreen
      items={FLAT_ISSUES}
      preview={{ type: 'issue', data: { id: 'i1' }, size: 'compact' }}
    />
  ),
}

// ---- Interactive: rein presentational, aber mit lokalem State für Augenschein ----
// Demonstriert die Tastatur-Kette OHNE Backend: in die Liste tabben → Pfeil rovet
// (focus-Ring), Space togglet Selektion, Shift+Pfeil markiert eine Range, Enter
// öffnet die Preview, Esc schließt sie, dann Tab → BulkActionBar-Menüs.
function StatefulBrowser() {
  const [selectedIds, setSelectedIds] = useState([])
  const [preview, setPreview] = useState(null)
  const [log, setLog] = useState(null)
  const open = (item) => setPreview({ type: item.kind, data: { id: item.id }, size: 'default' })
  return (
    <ElementBrowserScreen
      items={FLAT_ISSUES}
      selectedIds={selectedIds}
      preview={preview}
      onToggleSelect={(id) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      onSelectRange={setSelectedIds}
      onOpenItem={open}
      onClosePreview={() => setPreview(null)}
      onClearSelection={() => setSelectedIds([])}
      onBulkAction={(action, value) => setLog(`${action}: ${value ?? '—'}`)}
      filterMenu={null}
      bulkOptions={undefined}
      dataUiScope="screen.elementBrowser.interactive"
    />
  )
}

export const Interactive = {
  tags: ['status:review', 'qa_behavioral:n/a'],
  render: () => <StatefulBrowser />,
}

// ---- Connected: echter Daten-Roundtrip via Hook + MSW (Prod-Integrations-Beweis) ----

function ConnectedElementBrowser() {
  const browser = useElementBrowser({ projectId: 10 })
  if (browser.loading) {
    return <div data-ui="screen.elementBrowser.connected.loading" className="p-[var(--space-6)] text-[13px] text-[var(--subtext0)]">Lädt …</div>
  }
  if (browser.error) {
    return <div data-ui="screen.elementBrowser.connected.error" className="p-[var(--space-6)] text-[13px] text-[var(--accent-danger)]">Fehler: {browser.error}</div>
  }
  return (
    <ElementBrowserScreen
      items={browser.items}
      selectedIds={browser.selectedIds}
      expandedIds={browser.expandedIds}
      preview={browser.preview}
      bulkOptions={browser.bulkOptions}
      query={browser.query}
      sort={browser.sort}
      onQueryChange={browser.onQueryChange}
      onSortChange={browser.onSortChange}
      onToggleSelect={browser.onToggleSelect}
      onSelectRange={browser.onSelectRange}
      onToggleExpand={browser.onToggleExpand}
      onOpenItem={browser.onOpenItem}
      onClosePreview={browser.onClosePreview}
      onClearSelection={browser.onClearSelection}
      onBulkAction={browser.onBulkAction}
      dataUiScope="screen.elementBrowser.connected"
    />
  )
}

const bulkSpy = fn()

export const Connected = {
  tags: ['status:review', 'qa_behavioral:done'],
  render: () => <ConnectedElementBrowser />,
  parameters: {
    fullBleed: true,
    msw: { handlers: elementBrowserHandlers({ onBulk: (body) => bulkSpy(body) }) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    bulkSpy.mockClear()

    // 1) Load-Roundtrip: GET /api/backlog → MSW → Adapter mappt key/title → Zeile gerendert.
    await waitFor(() =>
      expect(canvas.getByText('Project-Switcher im Header verdrahten')).toBeInTheDocument(),
    )

    // 2) Selektion: Checkbox der ersten Zeile (Backlog-id 207 aus backlog-list.json).
    const selectBox = canvasElement.querySelector('[data-ui="screen.elementBrowser.connected.list.row-207.select"]')
    await userEvent.click(selectBox)

    // 3) Löschen öffnet den Bestätigungs-Dialog (kein sofortiger Roundtrip).
    const deleteBtn = canvasElement.querySelector('[data-ui="screen.elementBrowser.connected.bulk.action-delete"]')
    await userEvent.click(deleteBtn)
    const confirmBtn = await waitFor(() => {
      const el = canvasElement.querySelector('[data-ui="screen.elementBrowser.connected.bulk.confirm-delete.confirm"]')
      expect(el).toBeTruthy()
      return el
    })

    // 4) Bestätigen → PATCH /api/backlog/bulk { action:'cancel', ids:[207] }.
    await userEvent.click(confirmBtn)
    await waitFor(() =>
      expect(bulkSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'cancel', ids: [207] })),
    )
  },
}
