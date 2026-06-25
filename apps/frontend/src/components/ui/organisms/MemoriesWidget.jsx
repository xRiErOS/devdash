import { useState } from 'react'
import { Plus, ArrowLeft, X } from 'lucide-react'
import CaptureWidget from '../molecules/CaptureWidget.jsx'
import Input from '../atoms/Input.jsx'
import Select from '../atoms/Select.jsx'
import Checkbox from '../atoms/Checkbox.jsx'
import Link from '../atoms/Link.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * MemoriesWidget — GF-375 V2 Organism (05.30 Widgets). Verknüpfte Memories einer Entität in
 * der Terminal-Token-Sprache. Memories sind PERSISTENTE Entitäten (nicht abhakbar) und haben
 * IMMER eine Quelle im Projekt-Memory (PO 2026-06-19) — daher: zwei Modi (Body-Swap, wie
 * AttachmentWidget-Preview):
 *
 *   1. Liste (Default): die VERKNÜPFTEN Memories als bordered Rows (wie relevant-files-Rows) —
 *      Label + Öffnen-Icon (Quelle, immer) + Entlinken-X. Add-IconButton im create-Slot.
 *   2. MemoryForm (nach Add): Such/Filter/Sort über ALLE Projekt-Memories (Pool); Auswahl/
 *      Verknüpfen via Checkbox je Pool-Item (`.item-<key>.link`). Zurück-Pfeil → Liste.
 *
 * Präsentational/controlled: `memories` (Pool, je mit `linked`) + Callbacks (`onToggleLink`/
 * `onSearch`/`onSort`/`onFilter`) vom Consumer; `picking`/`query`/`sortValue`/`filterValue`
 * sind ephemerer UI-State. Titellos. Mono, 0 Roh-Hex, Atome statt roher Primitive (L2).
 *
 * data-ui: Wurzel `<scope>` (default `memories-widget`); CaptureShell `<scope>.capture`;
 * Add-Trigger `.add`. Liste: `.list` + je Row `.item-<key>`/`.item-<key>.label`/`.item-<key>.open`/
 * `.item-<key>.unlink`; Metrik `.count`; Leer `.empty-hint`. MemoryForm: `.form` + `.form.back`,
 * `.search`/`.search.input` (ghost), `.sort`, `.filter`, `.form.list` + je Pool-Item
 * `.item-<key>`/`.item-<key>.link` (Checkbox)/`.item-<key>.label`/`.item-<key>.open`.
 *
 * @param {object} props
 * @param {Array<{key:string, label:import('react').ReactNode, linked?:boolean, href:string}>} [props.memories] - Pool (jede Memory hat `href` = Quelle).
 * @param {(key:string, next:boolean)=>void} [props.onToggleLink] - Verknüpfen (Pool) / Entlinken (Row).
 * @param {(query:string)=>void} [props.onSearch]
 * @param {(mode:string)=>void} [props.onSort]
 * @param {(mode:string)=>void} [props.onFilter]
 * @param {Array<{value:string,label:string}>} [props.sortModes] - gesetzt → Sort-Slot (im Form).
 * @param {Array<{value:string,label:string}>} [props.filterModes] - gesetzt → Filter-Slot (im Form).
 * @param {import('react').ReactNode} [props.emptyHint='Keine Memories verknüpft.']
 * @param {boolean} [props.framed=false]
 * @param {import('react').ReactNode} [props.toolbarLabel] - Label LINKS in der Toolbar-Zeile
 *        (Composer reicht hier sein Sektions-CommentLabel ein, statt es als Header darüber zu setzen).
 * @param {string} [props.dataUiScope='memories-widget']
 * @param {string} [props.className]
 */
export default function MemoriesWidget({
  memories = [],
  onToggleLink,
  onSearch,
  onSort,
  onFilter,
  sortModes = [],
  filterModes = [],
  emptyHint = 'Keine Memories verknüpft.',
  framed = false,
  toolbarLabel,
  dataUiScope = 'memories-widget',
  className = '',
  ...rest
}) {
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [sortValue, setSortValue] = useState(sortModes[0]?.value ?? '')
  const [filterValue, setFilterValue] = useState(filterModes[0]?.value ?? '')

  const linked = memories.filter((m) => m.linked)

  const open = (m) => (
    <Link
      href={m.href}
      external
      variant="muted"
      aria-label="Quelle öffnen"
      className="shrink-0"
      data-ui={`${dataUiScope}.item-${m.key}.open`}
    />
  )

  // create-Slot (Liste) bzw. zurück (Form)
  const addSlot = (
    <IconButton
      icon={<Plus size={16} aria-hidden="true" />}
      label="Memory verknüpfen"
      onClick={() => setPicking(true)}
      size="sm"
      variant="ghost"
      reveal
      data-ui={`${dataUiScope}.add`}
    />
  )

  const searchSlot = picking ? (
    <div className="flex min-w-0 items-center gap-2">
      <IconButton
        icon={<ArrowLeft size={14} aria-hidden="true" />}
        label="Zurück zur Liste"
        onClick={() => setPicking(false)}
        size="sm"
        variant="ghost"
        data-ui={`${dataUiScope}.form.back`}
      />
      <div data-ui={`${dataUiScope}.search`} className="min-w-0 flex-1">
        <Input
          surface="transparent"
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onSearch?.(e.target.value) }}
          placeholder="// memories suchen"
          data-ui={`${dataUiScope}.search.input`}
          className="!py-1 !text-[12px] [font-family:var(--font-display)]"
        />
      </div>
    </div>
  ) : undefined

  const sortSlot = picking && sortModes.length > 0 ? (
    <Select
      options={sortModes}
      value={sortValue}
      onChange={(e) => { setSortValue(e.target.value); onSort?.(e.target.value) }}
      size="sm"
      data-ui={`${dataUiScope}.sort`}
      className="[font-family:var(--font-display)] text-[12px]"
    />
  ) : undefined

  const filterSlot = picking && filterModes.length > 0 ? (
    <Select
      options={filterModes}
      value={filterValue}
      onChange={(e) => { setFilterValue(e.target.value); onFilter?.(e.target.value) }}
      size="sm"
      data-ui={`${dataUiScope}.filter`}
      className="[font-family:var(--font-display)] text-[12px]"
    />
  ) : undefined

  const count = (
    <span data-ui={`${dataUiScope}.count`} className="tabular-nums">
      {linked.length} verknüpft
    </span>
  )

  return (
    <div data-ui={dataUiScope} className={`[font-family:var(--font-display)] ${className}`} {...rest}>
      <CaptureWidget
        dataUiScope={`${dataUiScope}.capture`}
        framed={framed}
        toolbarLabelSlot={picking ? undefined : toolbarLabel}
        searchSlot={searchSlot}
        sortSlot={sortSlot}
        filterSlot={filterSlot}
        createSlot={picking ? undefined : addSlot}
        metrics={[count]}
      >
        {picking ? (
          <div data-ui={`${dataUiScope}.form`}>
            <ul data-ui={`${dataUiScope}.form.list`} className="m-0 flex list-none flex-col gap-1 p-0">
              {memories.map((m) => (
                <li
                  key={m.key}
                  data-ui={`${dataUiScope}.item-${m.key}`}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5"
                >
                  <Checkbox
                    checked={Boolean(m.linked)}
                    onChange={() => onToggleLink?.(m.key, !m.linked)}
                    size="sm"
                    data-ui={`${dataUiScope}.item-${m.key}.link`}
                  />
                  <span data-ui={`${dataUiScope}.item-${m.key}.label`} className="min-w-0 flex-1 truncate text-[12px] text-[var(--text)]">
                    {m.label}
                  </span>
                  {open(m)}
                </li>
              ))}
            </ul>
          </div>
        ) : linked.length === 0 ? (
          <p data-ui={`${dataUiScope}.empty-hint`} className="text-[12px] text-[var(--subtext0)]">
            {emptyHint}
          </p>
        ) : (
          <ul data-ui={`${dataUiScope}.list`} className="m-0 flex list-none flex-col gap-1 p-0">
            {linked.map((m) => (
              <li
                key={m.key}
                data-ui={`${dataUiScope}.item-${m.key}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-elevated)] px-2 py-1"
              >
                <span data-ui={`${dataUiScope}.item-${m.key}.label`} className="min-w-0 flex-1 truncate text-[12px] text-[var(--text)]">
                  {m.label}
                </span>
                {open(m)}
                <IconButton
                  icon={<X size={14} aria-hidden="true" />}
                  label="Verknüpfung lösen"
                  onClick={() => onToggleLink?.(m.key, false)}
                  size="sm"
                  variant="ghost"
                  reveal
                  data-ui={`${dataUiScope}.item-${m.key}.unlink`}
                />
              </li>
            ))}
          </ul>
        )}
      </CaptureWidget>
    </div>
  )
}
