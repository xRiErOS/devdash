// GF-2 /dd-screen T03 — BacklogScreen (präsentational, props-driven, R6).
// F3 (PO-Review 2026-06-24): auf das Tier-07-Template MasterDetailScreen recomposed
// (MemoryBrowse-Muster 06.15) statt der raw MasterDetail-Primitive — Page-Header
// (Titel + Pills + New/Export) ist jetzt first-class, Suche/Filter leben im Sidebar-
// Kopf, Liste im Sidebar-Body, Detail im Pane. State + Daten kommen vom Container-
// Hook useBacklog. Getrimmtes SOLL (D01-D04): Sprint-Assign nur via Dropdown (kein
// dnd-kit), New = plain Button.
// T2 (Backlog-Pane V2, D07/D04): Detail-Pane zeigt IssueDetails (EntityDetail-V2)
// statt BacklogDetails; Meta-Edit via Pencil→IssueForm-Overlay (kein inline-Edit);
// Milestone read-only.
import { useState } from 'react'
import { Inbox, Plus, Download, RefreshCw } from 'lucide-react'
import { ISSUE_TYPES } from '@devd/api-types/backlog.contracts.js'
import MasterDetailScreen from '../../components/ui/templates/MasterDetailScreen.jsx'
import IssueRow from '../../components/ui/organisms/IssueRow.jsx'
import IssueDetails from '../../components/ui/organisms/IssueDetails.jsx'
import IssueForm from '../../components/ui/organisms/IssueForm.jsx'
import DeleteConfirmModal from '../../components/ui/organisms/DeleteConfirmModal.jsx'
import { displayId } from '../../lib/displayId.js'
import { REQUIRES_NOTES } from '../../lib/issueLifecycleTransitions.js'

// Synthetischer „Löschen"-Eintrag im Aktions-Cluster (Muster BacklogDetails, PO 2026-06-24):
// kein echter Status-Übergang — handleTransition fängt den Key ab → DeleteConfirmModal.
const DELETE_KEY = 'delete'
import BulkActionBar from '../../components/ui/organisms/BulkActionBar.jsx'
import FilterPopover from '../../components/ui/molecules/FilterPopover.jsx'
import SearchField from '../../components/ui/molecules/SearchField.jsx'
import EmptyState from '../../components/ui/molecules/EmptyState.jsx'
import Select from '../../components/ui/molecules/Select.jsx'
import Skeleton from '../../components/ui/atoms/Skeleton.jsx'
import Button from '../../components/ui/atoms/Button.jsx'
import Card from '../../components/ui/atoms/Card.jsx'
import { Stack, Cluster } from '../../components/ui/layout/index.js'
import { toIssueDetailsData } from './issueDetailsData.js'

// Contract-konforme Dropdown-Optionen
const TYPE_OPTIONS = ISSUE_TYPES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `P${n}` }))
const TYPE_FILTER_OPTIONS = [{ value: '', label: 'Alle Typen' }, ...TYPE_OPTIONS]
const SORT_OPTIONS = [
  { value: 'key', label: 'Key' },
  { value: 'priority', label: 'Priorität' },
  { value: 'created', label: 'Erstellt' },
]
const STATUS_TOGGLES = [
  { value: 'new', label: 'New' },
  { value: 'refined', label: 'Refined' },
]

// Sidebar-Kopf: Volltextsuche + konsolidiertes Filter-Menü (Status/Typ/Sort).
function FilterControls({
  search, onSearch, onClearSearch, statusFilters, onToggleStatusFilter, typeFilter, onChangeTypeFilter,
  sortOrder, onChangeSort, showCancelled, onToggleCancelled, activeFilterCount, onClearFilters,
}) {
  return (
    <div data-ui="backlog.toolbar" className="flex items-center gap-2">
      <SearchField value={search} onChange={onSearch} onClear={onClearSearch} surface="bordered" placeholder="Backlog durchsuchen…" className="flex-1 min-w-0" />
      <FilterPopover dataUi="backlog.toolbar.filter-menu" activeCount={activeFilterCount} onClear={onClearFilters} portal>
        <div data-ui="backlog.toolbar.filter.status">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--subtext0)] mb-1">Status</span>
          <Cluster gap="xs" className="flex-wrap">
            {STATUS_TOGGLES.map((s) => (
              <Button key={s.value} size="sm" variant={statusFilters.includes(s.value) ? 'primary' : 'secondary'} onClick={() => onToggleStatusFilter(s.value)}>
                {s.label}
              </Button>
            ))}
            <Button size="sm" variant={showCancelled ? 'primary' : 'secondary'} onClick={onToggleCancelled}>Storniert</Button>
          </Cluster>
        </div>
        <div data-ui="backlog.toolbar.filter.type">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--subtext0)] mb-1">Typ</span>
          <Select value={typeFilter} options={TYPE_FILTER_OPTIONS} onChange={onChangeTypeFilter} size="sm" ariaLabel="Typ-Filter" portal />
        </div>
        <div data-ui="backlog.toolbar.filter.sort">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--subtext0)] mb-1">Sortierung</span>
          <Select value={sortOrder} options={SORT_OPTIONS} onChange={onChangeSort} size="sm" ariaLabel="Sortierung" portal />
        </div>
      </FilterPopover>
    </div>
  )
}

// Header-Actions: New (plain, D02) + Export. Landet im EntityDetailHeader-action-Slot.
function HeaderActions({ onCreateClick, onExport }) {
  return (
    <div data-ui="backlog.toolbar.actions" className="flex items-center gap-2">
      <Button data-ui="backlog.toolbar.new" variant="primary" size="sm" leadingIcon={<Plus size={14} aria-hidden />} onClick={onCreateClick}>
        Neues Issue
      </Button>
      <Button data-ui="backlog.toolbar.actions.export" variant="secondary" size="sm" leadingIcon={<Download size={14} aria-hidden />} onClick={onExport}>
        Export
      </Button>
    </div>
  )
}

// Detail-Pane (T2/D07): IssueDetails-Organismus (EntityDetail-V2) rendert direkt im
// Master-Detail-Pane; Meta-Edit via Pencil→IssueForm-Overlay (D05/D06). IssueDetails
// trägt seinen eigenen Header — kein separater MasterDetailEntryTitle mehr.
function DetailPane({
  activeIssue, detailIssue, detailLoading,
  sprintOptions, editOpen, onOpenEdit, onCloseEdit,
  savingIssue, saveIssueError, onSaveIssue,
  onCopyMeta, onTransition, onRequestNotes, onDelete, deleteBusy = false,
}) {
  // Delete-Bestätigung lokal (Muster BacklogDetails). Hook vor dem early-return.
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!activeIssue) {
    return (
      <Card tone="transparent" padding="md" data-ui="backlog.detail.empty" className="bg-[var(--layer-3)] m-4">
        <EmptyState size="sm" icon={<Inbox size={20} />} title="Kein Issue gewählt" description="Issue links wählen, um Details zu sehen." />
      </Card>
    )
  }

  // Nutze angereicherten Voll-Datensatz sobald geladen; während des Ladens
  // Skeleton zeigen (Pane layer-1 bleibt sichtbar).
  const issueForDetail = detailIssue ?? activeIssue
  const data = toIssueDetailsData(issueForDetail, sprintOptions)

  // IssueForm-Prefill: sprint_id aus assigned_sprint, damit das Formular
  // korrekt vorausgefüllt ist.
  const prefill = {
    ...issueForDetail,
    sprint_id: issueForDetail.assigned_sprint ?? null,
  }

  // Transition-Cluster: Löschen (rot) als letzter Eintrag anhängen (nur wenn onDelete).
  const transitions = onDelete
    ? [...(data.transitions ?? []), { key: DELETE_KEY, label: 'Löschen', variant: 'danger' }]
    : (data.transitions ?? [])

  // Notes-Orchestrierung (Muster BacklogDetails): requiresNotes → onRequestNotes
  // (null = Abbruch) → onTransition(next, notes). Delete-Key → Confirm-Modal.
  const handleTransition = (key) => {
    if (key === DELETE_KEY) { setDeleteOpen(true); return }
    if (REQUIRES_NOTES.has(key)) {
      const notes = onRequestNotes?.(key) ?? null
      if (notes === null) return
      onTransition?.(key, notes)
      return
    }
    onTransition?.(key, null)
  }

  return (
    <div data-ui="backlog.detail-pane" className="min-w-0 overflow-y-auto h-full">
      {detailLoading && !detailIssue && (
        <Stack gap="sm" className="p-4">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} variant="block" height="2.5rem" />
          ))}
        </Stack>
      )}

      <IssueDetails
        data={{ ...data, transitions }}
        onEdit={onOpenEdit}
        onCopyMeta={onCopyMeta}
        onTransition={handleTransition}
      />

      {/* Pencil → IssueForm-Overlay (chrome=modal, mode=edit) */}
      <IssueForm
        mode="edit"
        chrome="modal"
        open={editOpen}
        issue={prefill}
        sprintOptions={sprintOptions}
        typeOptions={TYPE_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        submitting={savingIssue}
        error={saveIssueError}
        onSubmit={({ issueId, values }) => onSaveIssue({ issueId, values })}
        onClose={onCloseEdit}
        dataUiScope="backlog.detail.issue-form"
      />

      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => onDelete?.(issueForDetail)}
        busy={deleteBusy}
        dataUiScope="backlog.detail.delete-modal"
        message={`Issue ${displayId(issueForDetail)} — „${issueForDetail.title || ''}" wird unwiderruflich gelöscht.`}
      />
    </div>
  )
}

export default function BacklogScreen(props) {
  const {
    status, items, selectedIds, search, error, sprintOptions, projectSlug,
    bulkSprintId, onChangeBulkSprint,
    onCreateClick, onExport, onRetry, onOpen, onToggleMulti, onRowStatus,
    onClearSelection, onBulkAssignSprint, onBulkCancel,
    // Surface-Elevation des Backlog-Screens (PO-final 2026-06-24): Sidebar-Listen-
    // Panel = layer-1, IssueRow-Ruhe-Fill = layer-2, Detail-Pane-Canvas = layer-1.
    // Über die BacklogScreen-Story (Farb-Args) tunebar; Selection-Tönung der Rows
    // bleibt von rowRestTone unberührt. sidebarSurface/paneSurface → MasterDetail.
    sidebarSurface = 'layer-1', rowRestTone = 'layer-2', paneSurface = 'layer-1',
  } = props

  const bulkActions = [
    { id: 'assign-sprint', label: 'Sprint zuweisen', onAction: onBulkAssignSprint },
    { id: 'cancel', label: 'Stornieren', danger: true, onAction: onBulkCancel },
  ]

  // Sidebar-Body variiert je State; der Filter-Kopf ist immer sichtbar.
  let sidebarBody
  if (status === 'loading') {
    sidebarBody = (
      <div data-ui="backlog.loading" className="flex-1 min-h-0">
        <Stack gap="sm" className="p-2">
          {[0, 1, 2, 3, 4].map((n) => <Skeleton key={n} variant="block" height="2.5rem" />)}
        </Stack>
      </div>
    )
  } else if (status === 'empty') {
    sidebarBody = (
      <div className="flex-1 grid place-items-center p-4">
        <EmptyState
          icon={<Inbox size={28} />}
          title="Backlog ist leer"
          description="Lege ein erstes Issue an, um den Refinement-Prozess zu starten."
          action={(
            <Button data-ui="backlog.empty-state.create-issue" variant="primary" leadingIcon={<Plus size={14} aria-hidden />} onClick={onCreateClick}>
              Neues Issue
            </Button>
          )}
        />
      </div>
    )
  } else {
    sidebarBody = (
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <BulkActionBar selectedCount={selectedIds.length} onClearSelection={onClearSelection} actions={bulkActions} />
            <div data-ui="backlog.bulk.sprint">
              <Select value={bulkSprintId ?? ''} options={[{ value: '', label: 'Sprint…' }, ...sprintOptions]} onChange={onChangeBulkSprint} size="sm" ariaLabel="Bulk-Sprint-Ziel" portal />
            </div>
          </div>
        )}
        <div data-ui="backlog.list" data-testid="backlog-list" className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {items.map((item, i) => (
            <IssueRow
              key={item.id}
              item={item}
              search={search}
              isLast={i === items.length - 1}
              multiSelected={selectedIds.includes(item.id)}
              active={props.activeId === item.id}
              sprint={item.assigned_sprint ? { id: item.assigned_sprint, name: item.sprint_name } : null}
              onOpen={() => onOpen(item.id)}
              onToggleMulti={() => onToggleMulti(item.id)}
              onStatusChange={onRowStatus ? () => onRowStatus(item) : undefined}
              restTone={rowRestTone}
              dataUiScope="backlog.list.row"
            />
          ))}
        </div>
      </div>
    )
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-2 p-2">
      <FilterControls {...props} />
      {sidebarBody}
    </div>
  )

  const detail = status === 'error'
    ? (
      <Card tone="transparent" padding="md" data-ui="backlog.error" className="bg-[var(--layer-3)] m-4">
        <Stack gap="sm" className="items-start">
          <p className="m-0 text-[var(--accent-danger)]">{error || 'Backlog konnte nicht geladen werden.'}</p>
          <Button data-ui="backlog.error.retry" variant="secondary" size="sm" leadingIcon={<RefreshCw size={14} aria-hidden />} onClick={onRetry}>
            Erneut versuchen
          </Button>
        </Stack>
      </Card>
    )
    : <DetailPane {...props} activeIssue={props.activeIssue} />

  const pills = [{ k: 'count', label: 'Σ', value: String(items.length), tone: 'teal' }]
  if (selectedIds.length > 0) pills.push({ k: 'sel', label: 'Auswahl', value: String(selectedIds.length), tone: 'mauve' })

  return (
    <MasterDetailScreen
      rootDataUi="backlog"
      pageTitleDataUi="backlog.page-title"
      masterDetailScope="backlog.master-detail"
      sideWidth="28rem"
      sidebarSurface={sidebarSurface}
      paneSurface={paneSurface}
      header={{ id: projectSlug, title: 'Backlog', pills, action: <HeaderActions onCreateClick={onCreateClick} onExport={onExport} /> }}
      sidebar={sidebar}
      detail={detail}
    />
  )
}
