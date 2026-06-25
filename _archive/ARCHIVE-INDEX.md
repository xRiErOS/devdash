# Archiv — abgelöste Legacy-Komponenten (DD-581)

Hier liegen Legacy-Duplikat-Komponenten, deren kanonische Variante in
`src/components/ui/` lebt. Sie wurden aus dem aktiven Baum entfernt, nachdem alle
Konsumenten auf die `ui/`-Variante umgehängt wurden (Single-Source). Das Verzeichnis
liegt bewusst **außerhalb `src/`**, damit es weder vom Enforcement-Layer
(`inline-style-budget` walk(src)), vom Snapshot-Auto-Glob (`src/**/*.stories.jsx`),
noch von ESLint/Stylelint (`src/**`) erfasst wird.

Hintergrund: Census 2026-06-11 (DD-581) widerlegte die ursprüngliche Annahme
„tote Duplikate". Die Legacy-Dateien waren die LIVE-Implementierungen mit aktiven
Konsumenten; die `ui/`-Versionen die Storybook-Tier-Kopien. Archivierung erfordert
darum je Komponente eine Konsumenten-Migration (Import-Repoint legacy→ui/,
API-Kompatibilität verifiziert) plus Entfernen des `inline-style-budget`-Eintrags
(Ratchet-down).

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-11 | `src/components/StatusBadge.jsx` | `src/components/ui/atoms/StatusBadge.jsx` | Voll-Duplikat (Label-/Farb-Mapping), ui/ ist token-saubere API-Superset-Variante (`status` + `className` + `…rest` + `data-ui`) | SprintOrderOverlay, StatusPicker, sprintBoard/primitives, itemDetail/ReviewsTabContent, views/ItemDetail, views/DependencyGraph, views/MilestoneDetail (7) |

## DD-587 — Import-closed dead-legacy Set (2026-06-12)

Reachability-Analyse (BFS ab `src/main.jsx`/`src/App.jsx` inkl. `React.lazy(()=>import())`)
fand einen **import-CLOSED** Satz von 25 toten Dateien unter `src/components/` (LEAKS=0:
keine Live-Datei importiert eine davon). Alle 25 wurden gemeinsam archiviert — eine
Teilmenge hätte gebrochene Intra-Cluster-Imports hinterlassen. 19 haben ein kanonisches
`ui/`-Pendant (Duplikat); 6 sind tote Orphans ohne Pendant, mitgenommen um den Cluster
import-closed zu halten. Subpfade bleiben erhalten (`src/components/X` → `_archive/components/X`),
damit die Intra-Cluster-Relativ-Imports innerhalb `_archive` aufgelöst bleiben.
Begleitend: 16 `inline-style-budget`-Einträge entfernt + 17 entkoppelte Tests
retired/chirurgisch editiert (s. Commit DD-587).

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/ArchonLogPanel.jsx` | `src/components/ui/organisms/ArchonLogPanel.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/ExportMenu.jsx` | `src/components/ui/organisms/ExportMenu.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/IssueRow.jsx` | `src/components/ui/organisms/IssueRow.jsx` | Voll-Duplikat; ui/ ist kanonische Variante (Live-Consumer auf ui/ verdrahtet) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/MilestoneDeferredPopover.jsx` | — (toter Orphan, kein Pendant) | Toter Orphan: Deferred-Section per DD-510 gestrichen — Komponente ohne Konsument | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/MilestonePill.jsx` | `src/components/ui/atoms/MilestonePill.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/MilestoneSwimlane.jsx` | `src/components/ui/organisms/MilestoneSwimlane.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/SprintActions.jsx` | `src/components/ui/organisms/SprintActions.jsx` | Voll-Duplikat; ui/ ist kanonische Variante (Live-Consumer auf ui/ verdrahtet) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/SprintMilestonePicker.jsx` | `src/components/ui/organisms/SprintMilestonePicker.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/SprintOrderOverlay.jsx` | `src/components/ui/organisms/SprintOrderOverlay.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/StatusPicker.jsx` | `src/components/ui/organisms/StatusPicker.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/Tabs.jsx` | `src/components/ui/molecules/Tabs.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/milestone/MilestoneCreateModal.jsx` | `src/components/ui/organisms/MilestoneCreateModal.jsx` | Voll-Duplikat; ui/ ist kanonische Variante (Live-Consumer OverviewTab auf ui/ verdrahtet) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/AddLinkPicker.jsx` | `src/components/ui/organisms/AddLinkPicker.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/TodoDetailModal.jsx` | — (toter Orphan, kein Pendant) | Toter Orphan: Live-Pfad nutzt ui/organisms/ChecklistDetailModal; diese Variante ohne Konsument | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/TodoLinksList.jsx` | `src/components/ui/organisms/TodoLinksList.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/slots/SessionsSlotPlaceholder.jsx` | `src/components/ui/molecules/SessionsSlotPlaceholder.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/slots/SlotsContainer.jsx` | `src/components/ui/templates/SlotsContainer.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/slots/TerminalSlotPlaceholder.jsx` | `src/components/ui/molecules/TerminalSlotPlaceholder.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/slots/index.js` | — (toter Orphan, kein Pendant) | Toter Orphan: Slot-Registry-Barrel — nur vom toten slots-Cluster konsumiert (DD-487 Bottom-Slot disabled) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/slots/types.js` | — (toter Orphan, kein Pendant) | Toter Orphan: Slot-API-Konstanten (SLOT_NAMES/SLOT_REQUIRED_FIELDS) — nur vom toten slots-Barrel konsumiert | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/tabs/SettingsTab.jsx` | — (toter Orphan, kein Pendant) | Toter Orphan: Tab per DD-487 entfernt (Tab-Layout → Overview-Cards) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/projectHome/tabs/TodoTab.jsx` | — (toter Orphan, kein Pendant) | Toter Orphan: Tab per DD-487 entfernt; Todos leben als Card im Overview (delta T01) | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/sprintBoard/CancelledColumn.jsx` | `src/components/ui/organisms/CancelledColumn.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/sprintBoard/SprintColumn.jsx` | `src/components/ui/organisms/SprintColumn.jsx` | Voll-Duplikat; ui/ ist kanonische Variante | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/sprintBoard/primitives.jsx` | — (toter Orphan, kein Pendant) | Toter Orphan: SprintBoard-Mode-Architektur per DD-510 gestrichen; Primitives (IssueCard/SprintHeader/DroppableColumn) leben einzeln in ui/ | 0 (tot, 0 Live-Importer) |

## DD-586 — Batch1: 2 clean pure-swap repoints (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/ShortcutsHelp.jsx` | `src/components/ui/molecules/ShortcutsHelp.jsx` | Re-Export-Hülle aufgelöst (DD-499-Rest) | Layout (1) |
| 2026-06-12 | `src/components/projectHome/ProjectTodoList.jsx` | `src/components/ui/organisms/ProjectTodoList.jsx` | presentational Superset (+dataUiScope/className) | OverviewTab (1) |

## DD-585 — presentational Cutover (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/IconSidebar.jsx` | `src/components/ui/organisms/IconSidebar.jsx` | presentational Cutover (DD-585): Container-Logik (router, projectStore, fetch, badge) nach Layout.jsx gehoben | Layout (1) |

## DD-588 — presentational Cutover (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/settings/TagsCard.jsx` | `src/components/ui/organisms/TagsCard.jsx` | presentational Cutover (DD-588): Container-Logik (fetch, useState, useCallback, create/saveEdit/remove) nach ProjectSettings.jsx gehoben; dataUiScope="project-settings.tags" sichert identische data-ui-Anker | ProjectSettings (1) |
| 2026-06-12 | `src/components/settings/TesterLinkCard.jsx` | `src/components/ui/organisms/TesterLinkCard.jsx` | presentational Cutover (DD-588): Container-Logik (useState, handleToggle, PUT /api/projects/:id) nach ProjectSettings.jsx gehoben; dataUiScope="project-settings.tester-link" sichert identische data-ui-Anker; arch-yaml data_ui-ID project-settings.tester-link.deeplink.copy → .copy (Organism-Scope-Angleich) | ProjectSettings (1) |
| 2026-06-12 | `src/components/BulkBar.jsx` | `src/components/ui/organisms/BulkBar.jsx` | presentational Cutover (DD-588): Container-Logik (fetch /api/projects, fetch /api/backlog/bulk, fetch /api/backlog/:id/move, busy-State, confirm-Guards) nach BacklogPage.jsx gehoben; onAction-Callback ersetzt onResult; trash:false sichert D48 (kein Papierkorb) | BacklogPage (1) |
| 2026-06-12 | `src/components/SprintFormModal.jsx` | `src/components/ui/organisms/SprintFormModal.jsx` | presentational Cutover (DD-588): Container-Logik (fetch /api/milestones, POST /api/sprints, submitting-State, error-State) nach BacklogPage.jsx gehoben; onSubmit-Callback + milestones/submitting/error-Props ersetzen inline fetch+onCreated; DD-140 Issue-Zuweisung nach Submit erhalten; dataUiScope default sprint-form-modal (keine arch-yaml-Anker auf sprint-create-modal) | BacklogPage (1) |
| 2026-06-12 | `src/components/IssueCreateModal.jsx` | `src/components/ui/organisms/IssueCreateModal.jsx` | presentational Cutover (DD-588): Container-Logik (POST /api/backlog, POST /api/backlog/:id/attachments, saving-State, error-State, tagIds, pendingFiles) nach Layout.jsx + BacklogPage.jsx gehoben; onCreated→onCreate-Callback; tagSlot/attachmentSlot als Render-Props; dataUiScope default issue-create-modal (keine arch-yaml-Anker aktiv → kein Rename) | Layout (1), BacklogPage (1) |
| 2026-06-12 | `src/components/ProjectQuickSwitcher.jsx` | `src/components/ui/organisms/ProjectQuickSwitcher.jsx` | presentational Cutover (DD-588): Container-Logik (fetch /api/projects, pickProject mit VIEW_SEGMENTS/slug-Navigation, devd-open-project-switcher Event, Modal-Rahmen) nach Layout.jsx gehoben; dataUiScope="project-switcher" + Modal-DataUi backdrop/dialog sichern identische data-ui-Anker | Layout (1) |
| 2026-06-12 | `src/components/ProjectCreateModal.jsx` | `src/components/ui/organisms/ProjectCreateModal.jsx` | presentational Cutover (DD-588): Container-Logik (fetch /api/projects duplicate-check, POST /api/projects, setActiveProjectId, submitting/error-State) nach Layout.jsx gehoben; onCreate-Callback + existingSlugs/existingPrefixes-Props aus switcherProjects; dataUiScope="project-create-modal" sichert identische data-ui-Anker | Layout (1, via ProjectQuickSwitcher) |
| 2026-06-12 | `src/components/milestone/MilestoneForm.jsx` | `src/components/ui/organisms/MilestoneForm.jsx` | presentational Cutover (DD-588): Container-Logik (POST /api/milestones, PUT /api/milestones/:id, PATCH /api/milestones/:id {deferred}, saving/error-State) nach MilestoneDetail.jsx gehoben; initial→milestone, onSaved→onSubmit(values), saving/error als Props; dataUiScope="milestone-form" sichert identische data-ui-Anker | MilestoneDetail (1) |
| 2026-06-12 | `src/components/MilestoneDodEditor.jsx` | `src/components/ui/organisms/MilestoneDodEditor.jsx` | presentational Cutover (DD-588): Container-Logik (POST /api/milestones/:id/dod-items, PATCH /api/dod-items/:id, DELETE /api/dod-items/:id, PATCH .../dod-items/reorder) nach MilestoneDetail.jsx gehoben; milestoneId/items/onChange→criteria/onToggle/onAdd/onRemove; dataUiScope="milestone-detail.dod-editor" | MilestoneDetail (1) |
| 2026-06-12 | `src/components/MilestoneCloseDialog.jsx` | `src/components/ui/organisms/MilestoneCloseDialog.jsx` | presentational Cutover (DD-588): Container-Logik (GET /api/milestones/:id/open-issues, POST /api/milestones/:id/close-with-issues, loading/submitting/error-State) nach MilestoneDetail.jsx gehoben; milestoneId/onClose/onConfirmed→items/loading/submitting/error/onConfirm/onCancel; dataUiScope="milestone-close-dialog" | MilestoneDetail (1) |

## DD-589 — itemDetail-Cluster Legacy→ui/ Cutover, Slice 1 (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/itemDetail/ActionBar.jsx` | `src/components/ui/organisms/ActionBar.jsx` | presentational Cutover (DD-589): ui/ ist API-Superset (+dataUiScope); ItemDetail reicht dataUiScope="issue-detail" → issue-detail.transition.*/cancel-form.* | ItemDetail (1) |
| 2026-06-12 | `src/components/itemDetail/ActivityList.jsx` | `src/components/ui/organisms/ActivityList.jsx` | presentational Cutover (DD-589): fetch /api/backlog/:id/activity + loading-State nach ItemDetail gehoben (activity/loading-Props); dataUiScope="issue-detail.activity" | ItemDetail (1) |
| 2026-06-12 | `src/components/itemDetail/DetailsTabContent.jsx` | `src/components/ui/organisms/DetailsTabContent.jsx` | presentational Cutover (DD-589): Attachment-Upload/Remove (POST /api/backlog/:id/attachments, DELETE /api/attachments/:id) → onUpload/onRemoveAttachment-Callbacks; renderMarkdown + renderFilesRead/renderFilesEdit (RelevantFilesPicker) als Render-Props injiziert; dataUiScope="issue-detail" | ItemDetail (1) |
| 2026-06-12 | `src/components/itemDetail/MetaBlock.jsx` | `src/components/ui/atoms/MetaBlock.jsx` | presentational Cutover (DD-589): API-Superset (+className/…rest); drop-in | ItemDetail (1) |
| 2026-06-12 | `src/components/itemDetail/ReviewsTabContent.jsx` | `src/components/ui/organisms/ReviewsTabContent.jsx` | presentational Cutover (DD-589): createReview→onReview, creatingReview→reviewing; onSelectRound nicht verdrahtet (Legacy hatte keine Runden-Auswahl); dataUiScope="issue-detail.reviews" | ItemDetail (1) |
| 2026-06-12 | `src/components/itemDetail/SubTaskRow.jsx` | `src/components/ui/organisms/SubTaskRow.jsx` | presentational Cutover (DD-589): bereits präsentational; via ui/ TasksDepsTabContent komponiert (dataUiScope="issue-detail.subtasks.item") | TasksDepsTabContent (ui/, 1) |
| 2026-06-12 | `src/components/itemDetail/TasksDepsTabContent.jsx` | `src/components/ui/organisms/TasksDepsTabContent.jsx` | presentational Cutover (DD-589): Subtask-Mutationen (PATCH/POST/DELETE /api/subtasks*, PUT .../subtasks/order mit optimistic+revert, QA-Guard, prompt-QA-Edit) nach ItemDetail gehoben → onToggleTask/onRenameTask/onQaEditTask/onDeleteTask/onAddTask/onReorder; addDependency/removeDependency→onAddDep/onRemoveDep; dataUiScope="issue-detail" (dependencies.*→deps.* canonical; direction-select-Anker via Select data-ui-Durchreichung wiederhergestellt) | ItemDetail (1) |

## DD-589 — Leaf-Cutover (TagMultiSelect + RelevantFilesPicker), Slice 2+3 (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/TagMultiSelect.jsx` | `src/components/ui/molecules/TagMultiSelect.jsx` | DD-589 leaf cutover, state lifted to ItemDetail: ui/ Molecule ist präsentational — Tag-Optionen-Fetch (GET /api/tags) + Create-Flow (POST /api/tags, Zufallsfarbe) + loading nach ItemDetail.jsx UND Layout.jsx (IssueCreate-tagSlot) gehoben; options/onCreate/loading/allowCreate verdrahtet; named exports TagChip/TAG_COLORS waren tot (TagsCard hält eigene Kopien) | ItemDetail (1), Layout (1) |
| 2026-06-12 | `src/components/RelevantFilesPicker.jsx` | `src/components/ui/organisms/RelevantFilesPicker.jsx` | DD-589 leaf cutover, state lifted to ItemDetail: ui/ Organism ist präsentational — Autocomplete-Fetch (GET /api/projects/2/files?q=…, AbortController + 120ms-Debounce + r.ok-Guard) nach ItemDetail.jsx gehoben; onQueryChange/suggestions verdrahtet (renderFilesEdit), readOnly-Usages ohne suggestions; dataUiScope="issue-detail.files" | ItemDetail (1) |

## DD-472 T3 — twin-consolidation: MarkdownField + AttachmentDropzone (2026-06-12)

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/MarkdownField.jsx` | `src/components/ui/molecules/MarkdownField.jsx` | DD-472 T3 twin-consolidation — repointed to ui/ canonical | CaptureView (1) |
| 2026-06-12 | `src/components/AttachmentDropzone.jsx` | `src/components/ui/molecules/AttachmentDropzone.jsx` | DD-472 T3 twin-consolidation — repointed to ui/ canonical | Layout (1), BacklogPage (1) |
| 2026-06-12 | `src/components/NotesPanel.jsx` | `src/components/ui/organisms/NotesPanel.jsx` | DD-472 T3 twin-consolidation — state-lift into AppShell, repointed to ui/ | AppShell (1) |
| 2026-06-12 | `src/components/projectHome/ProjectHomeTabs.jsx` | `src/components/ui/organisms/ProjectHomeTabs.jsx` | DD-472 T3 twin-consolidation — call-site rewrite into ProjectHomeView, repointed to ui/ | ProjectHomeView (1) |
| 2026-06-12 | `src/components/projectHome/SettingsSidebar.jsx` | `src/components/ui/organisms/SettingsSidebar.jsx` | DD-472 T3 twin-consolidation — state-lift into ProjectHomeView, repointed to ui/ | ProjectHomeView (1) |

## DD-472 T3 — Task G: loose ui/ duplicates reconciled with canonical tier versions (2026-06-12)

Phase-2 final step: die 6 losen Duplikate direkt in `src/components/ui/*.jsx` (Storybook-Tier-Kopien-Vorläufer) wurden mit ihren kanonischen Tier-Versionen (`ui/templates/*` bzw. `ui/organisms/EditableSection`) konsolidiert. Der Barrel `ui/index.js` zeigte bereits nur auf die Tier-Versionen. Per Importer: Import-Repoint loose→tier + Call-Site-Prop `dataUi`→`dataUiScope` (gleicher Wert → Wurzel-Anker erhalten; die Tier-Version emittiert zusätzlich gepunktete Kind-Anker `${scope}.sidebar/.pane/.header/.sections/.summary-grid/.collection` etc. — additiv, keine Kollision). 2 Dateien (BoardPage, EditableSection) waren tot (0 Live-Importer). `inline-style-budget`-Eintrag für `ui/EditableSection.jsx` entfernt (Ratchet).

| Datum | Alt-Pfad | Kanonisches ui/-Pendant | Grund | Konsumenten umgehängt |
|---|---|---|---|---|
| 2026-06-12 | `src/components/ui/BoardPage.jsx` | `src/components/ui/templates/BoardPage.jsx` | DD-472 T3 — dead duplicate of canonical tier version | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/ui/EditableSection.jsx` | `src/components/ui/organisms/EditableSection.jsx` | DD-472 T3 — dead duplicate of canonical tier version | 0 (tot, 0 Live-Importer) |
| 2026-06-12 | `src/components/ui/MasterDetail.jsx` | `src/components/ui/templates/MasterDetail.jsx` | DD-472 T3 — superseded by canonical tier version, importers repointed + dataUi→dataUiScope | MemoryMasterDetail, ItemDetail, MilestoneDetail, SprintReview, SprintReview.stories (5) |
| 2026-06-12 | `src/components/ui/FormPage.jsx` | `src/components/ui/templates/FormPage.jsx` | DD-472 T3 — superseded by canonical tier version, importers repointed + dataUi→dataUiScope | CaptureView, GlobalSettings, ProjectSettings (3) |
| 2026-06-12 | `src/components/ui/DashboardPage.jsx` | `src/components/ui/templates/DashboardPage.jsx` | DD-472 T3 — superseded by canonical tier version, importers repointed + dataUi→dataUiScope | HomeDashboard (1) |
| 2026-06-12 | `src/components/ui/ListPage.jsx` | `src/components/ui/templates/ListPage.jsx` | DD-472 T3 — superseded by canonical tier version, importers repointed + dataUi→dataUiScope | ProjectsLanding (1) |
