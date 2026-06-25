import { useState } from 'react'
import MasterDetailScreen from '../../templates/MasterDetailScreen.jsx'
import Input from '../../atoms/Input.jsx'
import Button from '../../atoms/Button.jsx'
import EmptyState from '../../molecules/EmptyState.jsx'
import MemoryListRow from './MemoryListRow.jsx'
import MemoryDetailPanel from './MemoryDetailPanel.jsx'
import MemoryListFilter from './MemoryListFilter.jsx'
import { filterByCategory, filterByStability, filterByImportance, filterByPinned, filterBySearch, sortPinnedFirst } from './memoryListControls.js'

/**
 * MemoryBrowse — Feature-Komposition des Memory-Browsers (GF-433 T4, 06.15 Memory). Master-Detail:
 * links Listen-Container (Volltextsuche + Filter[category/stability/importance/pinned] + MemoryListRow-Liste),
 * rechts MemoryDetailPanel der selektierten Erinnerung. Root data-ui: memory-browse.root.
 *
 * Präsentational mit lokalem UI-State (Auswahl/Filter/Suche); Verdrahtung gegen Backend folgt im Cutover.
 * Layout = Tier-07-Template MasterDetailScreen (Recipe = ReviewFlow).
 */
export default function MemoryBrowse({
  memories = [],
  projectKey = '',
  projectTitle,
  selectedId: selectedIdProp,
  onSelect,
  onCopySnapshot,
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stability, setStability] = useState('')
  const [importance, setImportance] = useState('')
  const [pinned, setPinned] = useState('all')
  const [localSelected, setLocalSelected] = useState(null)

  let visible = filterByCategory(memories, category)
  visible = filterByStability(visible, stability)
  visible = filterByImportance(visible, importance ? Number(importance) : null)
  visible = filterByPinned(visible, pinned === 'pinned')
  visible = filterBySearch(visible, search)
  visible = sortPinnedFirst(visible)

  const selectedId = selectedIdProp ?? localSelected
  const selected = memories.find((m) => m.id === selectedId) || visible[0] || memories[0] || null
  const select = (id) => (onSelect ? onSelect(id) : setLocalSelected(id))

  const total = memories.length
  const stableCount = memories.filter((m) => m.stability === 'stable').length

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <Input
          data-ui="memory-browse.list.search"
          type="search"
          surface="bordered"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Erinnerungen durchsuchen…"
          aria-label="Erinnerungen durchsuchen"
          className="flex-1"
        />
        <MemoryListFilter
          category={category}
          onCategory={setCategory}
          stability={stability}
          onStability={setStability}
          importance={importance}
          onImportance={setImportance}
          pinned={pinned}
          onPinned={setPinned}
        />
      </div>
      <div className="flex flex-col gap-1 overflow-auto">
        {visible.map((memory) => (
          <MemoryListRow key={memory.id} memory={memory} selected={selected?.id === memory.id} onSelect={select} />
        ))}
      </div>
    </div>
  )

  const pane = selected ? (
    <MemoryDetailPanel memory={selected} />
  ) : (
    <EmptyState data-ui="memory-browse.empty" title="Keine Erinnerung gewählt" description="Wähle links eine Erinnerung oder passe die Filter an." />
  )

  const copyAction = (
    <Button data-ui="memory-browse.copy" variant="ghost" size="sm" onClick={onCopySnapshot}>
      Snapshot kopieren
    </Button>
  )

  return (
    <MasterDetailScreen
      rootDataUi="memory-browse.root"
      pageTitleDataUi="memory-browse.page-title"
      masterDetailScope="memory-browse.root"
      header={{
        id: projectKey,
        title: projectTitle || 'Erinnerungen',
        pills: [
          { k: 'total', label: 'Σ', value: String(total), tone: 'teal' },
          { k: 'stable', label: 'stable', value: `${stableCount}/${total}`, tone: 'green' },
        ],
        action: copyAction,
      }}
      sidebar={sidebar}
      detail={pane}
    />
  )
}
