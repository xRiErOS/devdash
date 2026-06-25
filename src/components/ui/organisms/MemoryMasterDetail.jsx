/**
 * MemoryMasterDetail — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/memory/MemoryMasterDetail.jsx + src/views/MemoryView.jsx,
 * DD-444 / DD-274).
 *
 * Domänen-bewusste Einheit: das vollständige Memory-Master-Detail-Panel —
 * FilterBar (Suche · Domain · Area · Wichtigkeit · Schlagwort · „+ Neu") links
 * über einer scrollbaren Memory-Liste (mit Pagination) als Master, rechts das
 * Detail-/Editier-Formular (Text · Domain · Area · Wichtigkeit · Schlagwörter ·
 * Speichern/Löschen/Abbrechen). Komponiert die Atoms Input/Textarea/Button/Pill
 * und die Molecules Select/EmptyState. Die Zwei-Spalten-Aufteilung wird inline
 * via Flex aufgebaut (kein Template-Import — Templates folgen erst Phase 4).
 *
 * DD-594 (F3 Mobile): responsive Conditional-Mount per useMediaQuery. ≥1024 =
 * Master-Detail-Two-Pane (Liste + Detail nebeneinander, IST-Verhalten). <1024 =
 * dedizierte Vollbild-Seite (Single-Column): entweder die Liste ODER das Detail
 * (selected/isNew) mit konsistentem Back-Arrow (`${dataUiScope}.detail.back`,
 * ≥44px) → `onBack`. Default true (Desktop) für SSR/Snapshot-Stabilität; immer
 * nur EIN Baum gemountet → keine doppelten data-ui-Anker (Lesson 335).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen, kein
 * 300ms-Debounce-Fetch, kein AbortController, kein `toast()` (CustomEvent),
 * kein DD-274-Availability-Gate. Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle hielt `memories`/`selected`/`loading`/Pagination via fetch
 *    (`buildListPath`/`fetchOne`/`extractList`/`onListLoaded`) im State. Alle
 *    DATEN kommen jetzt als reine Props: `items` (Liste), `selected` (Detail),
 *    `selectedId`, `loading`, `total`/`page`/`pages`.
 *  - Quelle rief `save`/`del`/`fetchOne` (fetch) + `onAfterSave`-Reload. Alle
 *    MUTATIONEN sind zu Callback-Props gehoben: `onSelect(id)`, `onNew()`,
 *    `onSave(form, { isNew, selectedId })`, `onDelete(id)`, `onFiltersChange(f)`,
 *    `onPageChange(page)`. Der Konsument führt die API-Calls + Toasts aus.
 *  - Der `confirm()`-Guard (destruktiv) entfällt — Confirmation ist Sache des
 *    Konsumenten im `onDelete`-Callback.
 *
 * Ephemerer UI-State BLEIBT lokal: der Form-Draft (`form`) inkl. Reset-Effekt
 * bei Wechsel der Selektion (`selected?.id`/`isNew`) sowie die `saving`/
 * `deleting`-In-Flight-Flags (zustandslos gegenüber Daten).
 *
 * @param {object} props
 * @param {object} props.filters - Filter-State { q, domain, area, wichtigkeit, schlagwort }
 * @param {(filters:object)=>void} props.onFiltersChange - Filter-Setter
 * @param {Array<object>} [props.items=[]] - Memory-Rows { id, text, domain, area?, wichtigkeit?, ... }
 * @param {object|null} [props.selected=null] - aktuell geladenes Memory (Detail) oder null
 * @param {string|null} [props.selectedId=null] - id der Listen-Selektion (Highlight)
 * @param {boolean} [props.isNew=false] - true → leeres Formular für Neuanlage
 * @param {boolean} [props.loading=false] - Liste lädt (reserviert für Skeleton/Hint)
 * @param {number} [props.total=0] - Gesamtzahl Memories (Listen-Kopf)
 * @param {number} [props.page=1] - aktuelle Seite
 * @param {number} [props.pages=1] - Gesamtseiten
 * @param {(id:string)=>void} [props.onSelect] - Listen-Eintrag wählen
 * @param {()=>void} [props.onNew] - „+ Neu" → leeres Detail-Formular
 * @param {(form:object, ctx:{isNew:boolean, selectedId:string|null})=>(void|Promise<void>)} [props.onSave]
 * @param {(id:string)=>(void|Promise<void>)} [props.onDelete]
 * @param {()=>void} [props.onCancel] - Neuanlage abbrechen
 * @param {()=>void} [props.onBack] - DD-594: Mobile-Back aus dem Detail zurück zur Liste (Selektion leeren)
 * @param {(page:number)=>void} [props.onPageChange] - Pagination
 * @param {string[]} [props.domains] - Domain-Optionen
 * @param {string[]} [props.wichtigkeiten] - Wichtigkeits-Optionen
 * @param {string} [props.dataUiScope='memory-master-detail'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {import('react').ReactNode} [props.title] - DD-671: optionaler Screen-Title-Node (PageTitle), über der FilterBar
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Container
 */

import { useState, useEffect } from 'react'
import { Brain, ArrowLeft } from 'lucide-react'
import Input from '../atoms/Input.jsx'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'
import Pill from '../atoms/Pill.jsx'
import Select from '../molecules/Select.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import useMediaQuery from '../../../hooks/useMediaQuery.js'

const DEFAULT_DOMAINS = ['Privat', 'Beruf', 'Wissen']
const DEFAULT_WICHTIGKEITEN = ['Zentral', 'Wichtig', 'Peripher']

// Domain → Pill-Farbe (statische Map, JIT-sichtbar). Q01: Indikatoren farbcodiert.
const DOMAIN_PILL_COLOR = {
  Privat: 'info',
  Beruf: 'warning',
  Wissen: 'primary',
}

// Wichtigkeit → Pill-Farbe (statische Map).
const WICHTIGKEIT_PILL_COLOR = {
  Zentral: 'warning',
  Wichtig: 'success',
  Peripher: 'neutral',
}

const EMPTY_FORM = { text: '', domain: 'Privat', area: '', wichtigkeit: 'Wichtig', schlagwoerter: '' }

// kleines, kompaktes Feld-Label (token-clean Ersatz für den inline labelCls).
function FieldLabel({ children, dataUi }) {
  return (
    <label data-ui={dataUi} className="text-[10px] uppercase tracking-wide text-[var(--subtext0)]">
      {children}
    </label>
  )
}

export default function MemoryMasterDetail({
  filters,
  onFiltersChange,
  items = [],
  selected = null,
  selectedId = null,
  isNew = false,
  loading = false,
  total = 0,
  page = 1,
  pages = 1,
  onSelect,
  onNew,
  onSave,
  onDelete,
  onCancel,
  onBack,
  onPageChange,
  domains = DEFAULT_DOMAINS,
  wichtigkeiten = DEFAULT_WICHTIGKEITEN,
  dataUiScope = 'memory-master-detail',
  title = null,
  className = '',
}) {
  // Ephemerer Form-Draft + In-Flight-Flags (kein Daten-State).
  const [form, setForm] = useState(selected || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // DD-594 (F3): responsive Detail-Präsentation. Default true (SSR/Snapshot =
  // Two-Pane, IST-Verhalten). Mobil <1024 → Single-Column Master-XOR-Detail.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)

  // Form-Reset NUR bei Wechsel der Selektion bzw. isNew — bewusst nicht bei jeder
  // `selected`-Identität (sonst überschriebe ein Refetch laufende Edits). 1:1 zur Quelle.
  useEffect(() => {
    setForm(selected || EMPTY_FORM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, isNew])

  const handleSave = async () => {
    if (!form.text.trim() || !form.domain || !form.area.trim()) return
    setSaving(true)
    try {
      await onSave?.(form, { isNew, selectedId })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await onDelete?.(selected.id)
    } finally {
      setDeleting(false)
    }
  }

  const domainOptions = domains.map((d) => ({ value: d, label: d }))
  const wichtigkeitOptions = [{ value: '', label: '—' }, ...wichtigkeiten.map((w) => ({ value: w, label: w }))]
  const showDetail = selected || isNew
  const reEmbedding = form.text !== (selected?.text || '')

  // Master (Liste) — Breite je Breakpoint: ≥1024 fixe 2/5-Spalte, <1024 voll.
  const listPanel = (
    <div
      data-ui={`${dataUiScope}.list`}
      className={`flex flex-col h-full overflow-hidden rounded-md bg-[var(--mantle)] border border-[var(--surface0)] ${isDesktop ? 'w-2/5 shrink-0' : 'w-full'}`}
    >
      <div
        data-ui={`${dataUiScope}.list.head`}
        className="flex justify-between px-3 py-1.5 text-xs shrink-0 text-[var(--subtext1)] border-b border-[var(--surface0)] bg-[var(--base)]"
      >
        <span>{total} Memories</span>
        <span>Seite {page} / {pages}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState
            size="sm"
            title={loading ? 'Lädt…' : 'Keine Memories'}
            description={loading ? undefined : 'Filter anpassen oder ein neues Memory anlegen.'}
          />
        ) : (
          items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect?.(m.id)}
              data-ui={`${dataUiScope}.list.item`}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--surface0)] ${m.id === selectedId ? 'bg-[var(--surface0)]' : 'bg-transparent'}`}
            >
              <div className="text-sm font-medium mb-1 truncate text-[var(--text)]">
                {m.text.slice(0, 80)}
              </div>
              <div className="flex gap-1 items-center flex-wrap">
                <Pill variant="outline" color={DOMAIN_PILL_COLOR[m.domain] || 'neutral'}>{m.domain}</Pill>
                {m.wichtigkeit && (
                  <Pill variant="ghost" color={WICHTIGKEIT_PILL_COLOR[m.wichtigkeit] || 'neutral'}>{m.wichtigkeit}</Pill>
                )}
                {m.area && <span className="text-[9px] text-[var(--subtext1)]">{m.area}</span>}
              </div>
            </button>
          ))
        )}
      </div>
      {pages > 1 && (
        <div
          data-ui={`${dataUiScope}.list.pagination`}
          className="flex gap-2 justify-center px-3 py-2 shrink-0 border-t border-[var(--surface0)]"
        >
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
            ‹ Zurück
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange?.(page + 1)}>
            Weiter ›
          </Button>
        </div>
      )}
    </div>
  )

  // Detail (Pane) — ≥1024 flexible Spalte, <1024 voll mit Back-Arrow-Header.
  const detailPanel = (
    <div
      data-ui={`${dataUiScope}.detail`}
      className={`flex flex-col min-w-0 h-full rounded-md bg-[var(--base)] border border-[var(--surface0)] overflow-hidden ${isDesktop ? 'flex-1' : 'w-full'}`}
    >
      {!isDesktop && showDetail && (
        <div className="flex items-center gap-2 px-2 py-2 shrink-0 bg-[var(--mantle)] border-b border-[var(--surface0)]">
          <button
            type="button"
            onClick={onBack}
            data-ui={`${dataUiScope}.detail.back`}
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
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!showDetail ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={<Brain size={40} strokeWidth={1} />}
              title="Memory auswählen oder neu anlegen"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-y-auto p-4 gap-3">
            <div className="flex justify-between items-center">
              <span data-ui={`${dataUiScope}.detail.title`} className="text-sm font-semibold text-[var(--text)]">
                {isNew ? 'Neues Memory' : 'Memory bearbeiten'}
              </span>
              <div className="flex gap-2">
                {isNew && (
                  <Button variant="secondary" size="sm" onClick={onCancel} data-ui={`${dataUiScope}.cancel`}>
                    Abbrechen
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  loading={saving}
                  onClick={handleSave}
                  data-ui={`${dataUiScope}.save`}
                >
                  {saving ? 'Speichert…' : 'Speichern'}
                </Button>
                {!isNew && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleting}
                    onClick={handleDelete}
                    data-ui={`${dataUiScope}.delete`}
                  >
                    {deleting ? 'Löscht…' : 'Löschen'}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel dataUi={`${dataUiScope}.field.text.label`}>
                Text {reEmbedding && <span className="text-[var(--accent-warning)]">⚡ Re-Embedding</span>}
              </FieldLabel>
              <Textarea
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                rows={5}
                data-ui={`${dataUiScope}.field.text`}
                className="text-sm min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <FieldLabel dataUi={`${dataUiScope}.field.domain.label`}>Domain</FieldLabel>
                <Select
                  ariaLabel="Domain"
                  value={form.domain}
                  onChange={(v) => setForm((f) => ({ ...f, domain: v }))}
                  options={domainOptions}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel dataUi={`${dataUiScope}.field.area.label`}>Area</FieldLabel>
                <Input
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                  data-ui={`${dataUiScope}.field.area`}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel dataUi={`${dataUiScope}.field.wichtigkeit.label`}>Wichtigkeit</FieldLabel>
                <Select
                  ariaLabel="Wichtigkeit"
                  value={form.wichtigkeit || ''}
                  onChange={(v) => setForm((f) => ({ ...f, wichtigkeit: v }))}
                  options={wichtigkeitOptions}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel dataUi={`${dataUiScope}.field.schlagwoerter.label`}>Schlagwörter (kommagetrennt)</FieldLabel>
              <Input
                value={form.schlagwoerter || ''}
                onChange={(e) => setForm((f) => ({ ...f, schlagwoerter: e.target.value }))}
                placeholder="Claude, Automatisierung, Heartbeat"
                data-ui={`${dataUiScope}.field.schlagwoerter`}
                className="text-sm"
              />
            </div>

            {!isNew && selected && (
              <div
                data-ui={`${dataUiScope}.detail.meta`}
                className="text-[10px] pt-2 flex gap-4 flex-wrap text-[var(--subtext1)] border-t border-[var(--surface0)]"
              >
                <span>ID: {String(selected.id).slice(0, 8)}</span>
                <span>Erstellt: {selected.created_at?.slice(0, 10)}</span>
                <span>Geändert: {selected.updated_at?.slice(0, 10)}</span>
                <span>Quelle: {selected.quelle_typ}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col h-screen overflow-hidden text-[var(--text)] ${className}`}
    >
      {/* DD-671: optionaler Screen-Title (PageTitle-Atom), vom Konsumenten als
          Node übergeben. shrink-0, damit Master/Detail den Resthöhenraum füllt. */}
      {title != null && (
        <div data-ui={`${dataUiScope}.title-bar`} className="px-4 pt-2 pb-2 shrink-0">
          {title}
        </div>
      )}
      {/* FilterBar */}
      <div
        data-ui={`${dataUiScope}.filter-bar`}
        className="flex gap-2 px-4 py-2 flex-wrap items-center shrink-0 bg-[var(--mantle)] border-b border-[var(--surface0)]"
      >
        <Input
          type="search"
          aria-label="Memories durchsuchen"
          placeholder="Memories durchsuchen…"
          value={filters.q}
          onChange={(e) => onFiltersChange?.({ ...filters, q: e.target.value, page: 1 })}
          data-ui={`${dataUiScope}.filter.search`}
          className="flex-1 min-w-[160px]"
        />
        <Select
          ariaLabel="Domain filtern"
          value={filters.domain}
          onChange={(v) => onFiltersChange?.({ ...filters, domain: v, page: 1 })}
          options={[{ value: '', label: 'Alle Domains' }, ...domainOptions]}
          className="w-40"
        />
        <Input
          aria-label="Area filtern"
          placeholder="Area…"
          value={filters.area}
          onChange={(e) => onFiltersChange?.({ ...filters, area: e.target.value, page: 1 })}
          data-ui={`${dataUiScope}.filter.area`}
          className="w-28"
        />
        <Select
          ariaLabel="Wichtigkeit filtern"
          value={filters.wichtigkeit}
          onChange={(v) => onFiltersChange?.({ ...filters, wichtigkeit: v, page: 1 })}
          options={[{ value: '', label: 'Alle Wichtigkeiten' }, ...wichtigkeitOptions.slice(1)]}
          className="w-44"
        />
        <Input
          aria-label="Schlagwort filtern"
          placeholder="#schlagwort"
          value={filters.schlagwort}
          onChange={(e) => onFiltersChange?.({ ...filters, schlagwort: e.target.value, page: 1 })}
          data-ui={`${dataUiScope}.filter.schlagwort`}
          className="w-32"
        />
        <Button
          variant="primary"
          size="md"
          onClick={onNew}
          data-ui={`${dataUiScope}.new`}
          className="ml-auto"
        >
          + Neu
        </Button>
      </div>

      {/* Master (Liste) + Detail (Pane) — DD-594: ≥1024 beide nebeneinander,
          <1024 Single-Column (Detail wenn selektiert, sonst Liste). */}
      <div className="flex-1 min-h-0 flex gap-3 p-3">
        {isDesktop ? (
          <>
            {listPanel}
            {detailPanel}
          </>
        ) : (
          showDetail ? detailPanel : listPanel
        )}
      </div>
    </div>
  )
}
