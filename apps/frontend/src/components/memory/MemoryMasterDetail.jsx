// src/components/memory/MemoryMasterDetail.jsx
//
// DD-444 (Frontend-Rework Phase 8): gemeinsamer Memory-Master-Detail-Organism.
// Dedup beider Memory-Views (ProjectMemoryView scope=project, MemoryView
// scope=global) auf EINE State-Maschine + EIN Layout (über den MasterDetail-
// Archetyp-Organismus, sidebarVariant="list").
//
// Recompose, NICHT Rewrite: die View-spezifische Logik (Pfadbau, FilterBar,
// Listen-/Detail-Rendering, Pagination, 503-Fallback) wird über injizierte
// Adapter/Render-Props eingebracht — der Organism verdrahtet nur das gemeinsame
// Grundgerüst. So bleibt der harte Scope-Unterschied (X-Project-Id-scoped vs.
// global) und das DD-274-Availability-Gate strikt in den Wrappern.
//
// Verhalten 1:1 erhalten:
//  - 300ms-Debounce + AbortController im Fetch-Effekt (Cleanup clearTimeout + abort)
//  - Select/New/Save/Delete-Handler-Kontrakt
//  - Toast via window CustomEvent('devd-toast')
//  - data-testid/data-ui-Anker werden von den Render-Props geliefert
//
// Styling ausschließlich über Catppuccin-Tokens als Tailwind-Arbitrary-Value-
// Klassen (ZERO inline style).

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import MasterDetail from '../ui/templates/MasterDetail.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'

function toast(message, kind = 'info') {
  window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message, kind } }))
}

/**
 * MemoryMasterDetail — gemeinsame Memory-Liste/Detail-Maschine (DD-444).
 *
 * @param {object} props
 * @param {object} props.filters - aktueller Filter-State (View-spezifisch geformt)
 * @param {Function} props.onFiltersChange - setter (setFilters); Signatur folgt dem View-FilterBar
 * @param {Function} props.buildListPath - (filters) => REST-Pfad für die Liste/Suche
 * @param {Function} props.extractList - (json) => Array der Memory-Rows (entkoppelt list vs paginated payload)
 * @param {Function} props.onListLoaded - optional (json) => void, für Pagination-Meta (total/page/pages)
 * @param {Function} [props.beforeFetch] - optional () => boolean: false bricht den Fetch ab (Availability-Gate-Hook)
 * @param {Function} [props.onFetchResponse] - optional (res) => boolean: true = handled/abort (z.B. 503-Fallback)
 * @param {Function} props.fetchOne - (id) => Promise<memory>
 * @param {Function} props.save - (body, ctx:{isNew, selectedId}) => Promise<saved|null>
 * @param {Function} [props.onAfterSave] - optional ({ saved, wasNew }) => boolean: true = Reload selbst übernommen
 * @param {Function} props.del - (id) => Promise<void>
 * @param {Function} props.renderFilterBar - ({ filters, onChange, onNew }) => ReactNode
 * @param {Function} props.renderList - ({ selectedId, onSelect, loading }) => ReactNode (Sidebar-Inhalt)
 * @param {Function} props.renderDetail - ({ memory, isNew, onSave, onDelete, onCancel }) => ReactNode (Pane-Inhalt)
 * @param {React.ReactNode} [props.title] - optionaler Breadcrumb/Titel über dem Organism
 * @param {string} [props.sideWidth='40%'] - Breite der Listen-Spalte (vereinheitlichtes Token, DD-444)
 * @param {string} [props.dataUi] - data-ui am Wurzel-Container
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container
 */
export default function MemoryMasterDetail({
  filters,
  onFiltersChange,
  buildListPath,
  extractList,
  onListLoaded,
  beforeFetch,
  onFetchResponse,
  fetchOne,
  save,
  onAfterSave,
  del,
  renderFilterBar,
  renderList,
  renderDetail,
  title = null,
  sideWidth = '40%',
  dataUi,
  className = '',
  heightClass = 'h-screen',
}) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  // DD-594 (F3): responsive Conditional-Mount. ≥1024 Two-Pane (IST), <1024
  // Single-Column (Liste ODER Detail). Default true → SSR/Snapshot = Two-Pane.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)

  const fetchList = useCallback(async (f, signal) => {
    setLoading(true)
    try {
      const res = await fetch(buildListPath(f), { signal })
      // View-Hook für Sonderzustände (z.B. 503 → serverUnavailable). Liefert der
      // Hook true zurück, gilt die Response als behandelt und wir brechen ab.
      if (onFetchResponse && onFetchResponse(res)) return
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const json = await res.json()
      setMemories(extractList(json))
      onListLoaded?.(json)
    } catch (e) {
      if (e.name === 'AbortError') return
      toast(e.message, 'error')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [buildListPath, extractList, onListLoaded, onFetchResponse])

  useEffect(() => {
    if (beforeFetch && beforeFetch() === false) return
    const ac = new AbortController()
    const timer = setTimeout(() => fetchList(filters, ac.signal), 300)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [filters, fetchList, beforeFetch])

  const handleSelect = async (id) => {
    setIsNew(false)
    setSelectedId(id)
    try {
      setSelected(await fetchOne(id))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const handleNew = () => {
    setSelectedId(null)
    setSelected(null)
    setIsNew(true)
  }

  const handleSave = async (body) => {
    try {
      const wasNew = isNew
      const saved = await save(body, { isNew, selectedId })
      if (saved == null) return // Wrapper hat Toast/Fehler bereits behandelt
      setIsNew(false)
      setSelectedId(saved.id)
      setSelected(saved)
      // Reload-Strategie: der Wrapper darf sie übernehmen (z.B. MemoryView resettet
      // bei wasNew die Pagination auf Seite 1, was den Fetch-Effekt selbst auslöst).
      if (onAfterSave && onAfterSave({ saved, wasNew })) return
      fetchList(filters)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await del(id)
      setSelectedId(null)
      setSelected(null)
      setIsNew(false)
      fetchList(filters)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // DD-594 (F3 Mobile): Back aus der Vollbild-Detailseite zurück zur Liste.
  const handleBack = () => {
    setSelectedId(null)
    setSelected(null)
    setIsNew(false)
  }

  const sidebar = renderList({ memories, selectedId, onSelect: handleSelect, loading })
  const pane = renderDetail({
    memory: selected,
    isNew,
    onSave: handleSave,
    onDelete: handleDelete,
    onCancel: () => setIsNew(false),
  })
  const showDetail = selected || isNew
  const backScope = dataUi || 'memory-master-detail'
  const filterBar = renderFilterBar({ filters, onChange: onFiltersChange, onNew: handleNew })

  return (
    <div data-ui={dataUi} className={`flex flex-col ${heightClass} overflow-hidden ${className}`}>
      {title}
      {isDesktop ? (
        <>
          {filterBar}
          <div className="flex-1 min-h-0">
            <MasterDetail sidebarVariant="list" sideWidth={sideWidth} sidebar={sidebar} pane={pane} />
          </div>
        </>
      ) : showDetail ? (
        // DD-594 (F3 Mobile): Vollbild-Detailseite mit konsistentem Back-Arrow.
        <>
          <div className="flex items-center gap-2 px-2 py-2 shrink-0 bg-[var(--mantle)] border-b border-[var(--surface0)]">
            <button
              type="button"
              onClick={handleBack}
              data-ui={`${backScope}.detail.back`}
              aria-label="Zurueck zur Liste"
              title="Zurueck"
              className="inline-flex items-center justify-center rounded-lg w-11 h-11 text-[var(--subtext0)] hover:bg-[var(--surface0)]"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="font-semibold truncate min-w-0 text-[var(--text)]">
              {isNew ? 'Neues Memory' : 'Memory bearbeiten'}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--base)]">{pane}</div>
        </>
      ) : (
        // DD-594 (F3 Mobile): Single-Column-Liste (Master) als dedizierte Seite.
        <>
          {filterBar}
          <div className="flex-1 min-h-0 overflow-y-auto m-2 rounded-md bg-[var(--mantle)] border border-[var(--surface0)]">
            {sidebar}
          </div>
        </>
      )}
    </div>
  )
}
