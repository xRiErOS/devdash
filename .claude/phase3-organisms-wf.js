export const meta = {
  name: 'phase3-organisms',
  description: 'Storybook-Canonical Phase 3: Organisms token-clean nach src/components/ui/organisms/ (harvest + extract + Defers). PRESENTATIONAL (kein fetch/Store, Daten+Mutations als Props), komponiert kanonische Atoms (../atoms/) + Molecules (../molecules/). Batch-parametrisiert via args.batch (1..5). Adversarialer Verify pro Organism.',
  phases: [
    { title: 'Build', detail: 'Organism + Story, presentational, importiert ../atoms/ + ../molecules/, 0 inline-style (DnD-transform maxInline=1), dataUiScope-Prop' },
    { title: 'Verify', detail: 'pro Organism: eslint max-warnings=0, inline<=maxInline, rawHex==0, Story-title korrekt, dataUiScope vorhanden' },
  ],
}

const ROOT = '/Users/erik/Obsidian/tools/DeveloperDashboard'

const CONVENTIONS = `
KONTEXT — DevDashboard React 19 + Tailwind v4 + Catppuccin (Latte hell / Macchiato dunkel).
Arbeite vom Repo-Root: ${ROOT}

KANONISCHE LIBRARY — Stufe-2 Greenfield+Harvest, ADDITIV, Tier=ORGANISM:
- Neue Datei schreiben nach src/components/ui/organisms/<Name>.jsx (Tier-Namespace, Ordner neu anlegen falls nicht da).
- Story daneben: src/components/ui/organisms/<Name>.stories.jsx, Story-title = 'Organisms/<Name>'.
- ALTE Quell-Datei NICHT anfassen/löschen, KEINE Screen-Imports umbiegen, Barrel index.js NICHT ändern. Rein additiv. Screens migrieren erst in Phase 5.

ORGANISM-TIER:
- Organism = kennt eine DOMÄNE (Sprint/Issue/Milestone/Todo/Memory/Review/SSTD/ApiKey/Tag) und komponiert Atoms+Molecules zu einer domänen-bewussten Einheit.
- TIER-RECHECK (pragmatisch): kennt die Komponente WIRKLICH keine Domäne, nur generische Komposition? -> melde "SHOULD_BE_MOLECULE" im summary statt falsch zu bauen. Nur Layout-Slots ohne Domäne -> "SHOULD_BE_TEMPLATE". Baue trotzdem, aber flagge.

PRESENTATIONAL (D-Phase3-01, VERBINDLICH):
- KEIN fetch, KEIN useEffect-Datenladen, KEIN Store/projectStore, KEINE API-Calls (apiClient/fetch). Diese Kopplung beim Harvest ENTFERNEN.
- Externe DATEN kommen als Props rein (z.B. keys=[], items=[], activity=[], value, sprint, issue). MUTATIONEN als Callback-Props (onSave/onDelete/onCreate/onChange/onTransition/onSelect...).
- Lokaler EPHEMERER UI-State BLEIBT (useState für open/editing/draft/query/activeIdx, useRef, Outside-Click-useEffect, Keyboard-Handler). Das ist KEIN Daten-State.
- Markup verlustfrei harvesten (gleiche DOM-Struktur, gleiche Klassen-Semantik). Im JSDoc kurz dokumentieren welche fetch/Store-Kopplung zu Props gehoben wurde.

WIEDERVERWENDUNG — importiere bereits gebaute Bausteine statt inline neu zu bauen:
- Atoms (src/components/ui/atoms/): Button, Card, CardHead, Cluster, Grid, Ico, IconButton, Input, IssuePill, MetaBlock, MetaRow, MilestonePill, OptIcon, Pill, PopoverPanel, ProgressBar, Sidebar, SprintPill, Stack, StatusBadge, StickyActionBar, TabButton, TabIcon, Textarea, Tooltip, TypeIcon, typeIcons.
- Molecules (src/components/ui/molecules/): AttachmentDropzone, Breadcrumb, DebugOverlay, DroppableColumn, EmptyState, FeedbackPin, FilterPopover, InlineEdit, LinkRow, MarkdownField, MetaCard, MetaPill, Modal, PreviewOverlay, PreviewToolbar, SegmentedControl, Select, SessionsSlotPlaceholder, ShortcutsHelp, Tabs, TagMultiSelect, TerminalSlotPlaceholder.
- Import-Pfad: '../atoms/<Name>.jsx' bzw. '../molecules/<Name>.jsx'. Lies die Datei kurz für die echte Props-API bevor du sie verdrahtest.
- Wenn ein Organism ein anderes Organism komponiert (z.B. SprintColumn->SprintHeader+SortableIssueCard), importiere es aus './<Name>.jsx' (gleicher organisms-Ordner) — es ist in einem früheren Batch gebaut.

KANONISCHES MUSTER (wie atoms/ProgressBar.jsx, molecules/Select.jsx — lies eine als Vorlage falls unsicher):
- default export function <Name>(props), JSDoc-Proptypes-Kommentar darüber.
- Variant/Size/Tone als STATISCHE Klassen-Maps (const MAP={...}), KEINE String-Interpolation im Token (Tailwind-JIT muss Klassen literal sehen).

DATA-UI (DD#61 + I03 + D01, VERBINDLICH):
- Gepunktet: <bereich>.<sub>.<element> (z.B. "issue-card.title", "issue-card.tags.item"). NICHT hyphen-gejoint über Ebenen.
- I03 — der Wurzel-bereich ist PARAMETRISIERT, NICHT hardcoded: Prop \`dataUiScope\` mit sinnvollem component-bereich-Default (kebab des Namens, z.B. 'issue-card'). Wurzel-Element: data-ui={dataUiScope}. Sub-Anker: data-ui={\`\${dataUiScope}.title\`} usw. So kann der Screen in Phase 5 via dataUiScope='backlog' den ganzen Namespace auf area-bereich umbiegen (D01 Dual-Namespace). NIEMALS einen Domänen-bereich (backlog./sprint-detail./milestones.) hart in die Library-Datei schreiben.

TOKEN-CLEAN (style={{}} -> Tailwind v4 arbitrary):
- background:'var(--accent-primary)' -> bg-[var(--accent-primary)]; color:'var(--on-accent)' -> text-[var(--on-accent)]; bg-[var(--surface1)]
- color-mix: bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] (Spaces -> Unterstrich!)
- feste px via Map auf Tailwind-Klassen; disabled via Klassen 'disabled:opacity-50 disabled:cursor-not-allowed'; Radius rounded/rounded-lg/rounded-md (Tailwind-v4 liest var(--radius-*)).
- KEIN Roh-Hex (#rrggbb). Falls Quelle Hex hat -> auf passenden Token mappen (--accent-*, --surface*, --text, --subtext*).
Tokens: --accent-{primary,success,danger,warning,info}, --surface{0,1,2}, --text, --subtext{0,1}, --on-accent, --radius-{sm,md,lg,xl}.

DYNAMISCHE-STYLE-AUSNAHME (NUR wenn maxInline>0):
- EIN echt runtime-dynamischer style={...} (DnD-transform via useSortable/useDraggable, Klick-/Cursor-Position, iframe-Dimension) darf bleiben. Darüber: \`// eslint-disable-next-line react/forbid-dom-props -- <Begründung>\` (exakte Rule-ID via eslint verifizieren). Alle statischen Styles trotzdem -> Tailwind. Prozent-Breiten besser via importiertem ProgressBar-Atom.

DND-STORIES: nutzt das Organism @dnd-kit-Hooks (useSortable/useDroppable/useDraggable) ODER komponiert ein DnD-Organism, MUSS die Story-Render in einen <DndContext>-Decorator gewrappt sein (import { DndContext } from '@dnd-kit/core'), sonst crasht sie.

HARVEST = verlustfrei (gleiches Markup + Verhalten, Daten/Fetch zu Props gehoben). EXTRACT = benannte Inline-(Sub-)Komponente/Export aus Multi-Export-File herausziehen, verlustfrei, Domänen-Daten zu Props.

STORY: default export { title:'Organisms/<Name>', component }, named exports Default + relevante Varianten/States. Realistische MOCK-Props inline im Story-File definieren (Array/Objekt-Konstanten), Callbacks als no-op (() => {}). KEIN inline-style, KEIN Roh-Hex in der Story.
`

const BUILD_SCHEMA = {
  type: 'object',
  required: ['component', 'componentPath', 'storyPath', 'inlineStyleCount', 'rawHexCount', 'summary'],
  properties: {
    component: { type: 'string' }, componentPath: { type: 'string' }, storyPath: { type: 'string' },
    inlineStyleCount: { type: 'number' }, rawHexCount: { type: 'number' },
    atomsImported: { type: 'array', items: { type: 'string' } },
    moleculesImported: { type: 'array', items: { type: 'string' } },
    liftedCoupling: { type: 'string' },
    tierFlag: { type: 'string', enum: ['ORGANISM_OK', 'SHOULD_BE_MOLECULE', 'SHOULD_BE_TEMPLATE'] },
    variantsCovered: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['component', 'eslintPass', 'inlineWithinBudget', 'rawHexZero', 'storyExists', 'dataUiScopeOk', 'verdict'],
  properties: {
    component: { type: 'string' }, eslintPass: { type: 'boolean' }, inlineWithinBudget: { type: 'boolean' },
    inlineStyleCount: { type: 'number' }, rawHexZero: { type: 'boolean' }, storyExists: { type: 'boolean' },
    dataUiScopeOk: { type: 'boolean' },
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, issues: { type: 'array', items: { type: 'string' } },
  },
}

// 56 Organisms, dependency-geordnet in 5 Batches. mode: harvest | extract.
// dnd: Story muss in <DndContext> gewrappt sein. composes: Hinweis welche Bausteine importieren.
const ORGANISMS = [
  // ===== BATCH 1 — Basis-Leafs (nur Atoms/Molecules, keine Organism-Deps) =====
  { batch: 1, name: 'IssueCard', mode: 'extract', source: 'src/components/sprintBoard/primitives.jsx', exportName: 'IssueCard', maxInline: 0,
    note: 'Einzelne Issue-Karte (priority-border, status, type, tags, archon, subtask, multi-select highlight). KERN-Organism, viele wrappen es. Props: { issue, selected?, multiSelect?, onSelect?, ... }. Importiere StatusBadge, MilestonePill, Pill, TypeIcon/typeIcons wo passend. 16× style -> Token (größter Block).' },
  { batch: 1, name: 'SprintHeader', mode: 'extract', source: 'src/components/sprintBoard/primitives.jsx', exportName: 'SprintHeader', maxInline: 0,
    note: 'Sprint-Metadaten-Zeile + Kapazitätsbalken. Kapazitäts-Balken -> ../atoms/ProgressBar.jsx (capacity={true}). Importiere SprintPill, StatusBadge. Archon-Button als Button-Atom. Daten (sprint, capacity) als Props, onSprintChanged/onReorder als Callbacks.' },
  { batch: 1, name: 'SprintRow', mode: 'extract', source: 'src/components/roadmap/SwimlaneMode.jsx', exportName: null, maxInline: 0,
    note: 'NEU-EXTRAKTION (I01): inline Sprint-Zeile, dupliziert in SwimlaneMode (data-ui milestones.sprint-row.*) UND SprintDetail (sprint-detail.row.*). Komponiert ../atoms/ProgressBar.jsx + ../atoms/StatusBadge.jsx + ../atoms/SprintPill.jsx. Props: { sprint, doneCount, totalCount, onSelect? }. Lies BEIDE Quellen (auch src/views/SprintDetail.jsx) und vereinheitle zu einer kanonischen Zeile. dataUiScope-Default "sprint-row".' },
  { batch: 1, name: 'IssueRow', mode: 'harvest', source: 'src/components/IssueRow.jsx', maxInline: 0,
    note: 'Backlog-Row (Status/Prio/Sprint-Zuweisung). I03-BEISPIEL: heute backlog.* hardcoded -> dataUiScope-Prop (Default "issue-row"). Importiere StatusBadge, Pill, SprintPill. PriorityBadge inline als statische Map (kommt später als Atom). 3× style -> Row-Klassen.' },
  { batch: 1, name: 'ActivityList', mode: 'harvest', source: 'src/components/itemDetail/ActivityList.jsx', maxInline: 0,
    note: 'Timeline-Render von Aktivitäten + relative Zeit. PRESENTATIONAL: fetch(activity) ENTFERNEN -> activity=[] als Prop. Lokaler State (falls Expand-Toggle) bleibt. 6× style -> Token.' },
  { batch: 1, name: 'EditableSection', mode: 'harvest', source: 'src/components/ui/EditableSection.jsx', maxInline: 0,
    note: 'Editierbares View-Segment (Save/Edit-Logik + data-ui). Wird von DetailsTabContent komponiert (Batch 4). Save/Edit-State bleibt (UI-State), onSave als Prop. Importiere Button. 7× style -> Tailwind.' },
  { batch: 1, name: 'TodoPreviewSection', mode: 'extract', source: 'src/components/projectHome/SettingsSidebar.jsx', exportName: 'TodoPreviewSection', maxInline: 0,
    note: 'Todo-Vorschau-Liste mit Status-Badge. Props: { todos=[] }. Importiere StatusBadge/Pill. Clean (0 style erwartet).' },
  { batch: 1, name: 'TodoInput', mode: 'harvest', source: 'src/components/projectHome/TodoInput.jsx', maxInline: 0,
    note: 'Enter-Submit Todo-Eingabe + Plus-Icon. onCreate(label) als Prop, lokaler input-State bleibt. Importiere Input + IconButton. 4× style -> Token.' },
  { batch: 1, name: 'SprintActions', mode: 'harvest', source: 'src/components/SprintActions.jsx', maxInline: 0,
    note: 'Sprint-Lifecycle-Aktionsgruppe (start/complete/cancel) + Lifecycle-Guard. onAction-Callbacks als Props. Importiere Button. Clean (0 style).' },
  { batch: 1, name: 'ExportMenu', mode: 'harvest', source: 'src/components/ExportMenu.jsx', maxInline: 0,
    note: 'Export-Format-Menu (Sprint/Issue). Dropdown -> ../atoms/PopoverPanel.jsx. onExport(format) als Prop, open-State bleibt. 4× style -> Token.' },
  { batch: 1, name: 'StatusPicker', mode: 'harvest', source: 'src/components/StatusPicker.jsx', maxInline: 0,
    note: 'Status-Dropdown mit lifecycle-aware Options. options/value als Props, onChange-Callback. Dropdown -> PopoverPanel, evtl. ../molecules/Select.jsx wenn passend. 7× style -> Token.' },
  { batch: 1, name: 'SprintMilestonePicker', mode: 'harvest', source: 'src/components/SprintMilestonePicker.jsx', maxInline: 0,
    note: 'Milestone-Zuweisung für Sprint. milestones/value als Props, onChange-Callback, fetch ENTFERNEN. Importiere Select/MilestonePill. 2× style -> Token.' },

  // ===== BATCH 2 — Wrapper + Listen-Items + Panels (deps: IssueCard aus B1) =====
  { batch: 2, name: 'SortableIssueCard', mode: 'extract', source: 'src/components/sprintBoard/primitives.jsx', exportName: 'SortableIssueCard', maxInline: 1, dnd: true,
    note: 'DEFER. DnD-Wrapper um IssueCard (useSortable, disabled-Guard). Importiere ./IssueCard.jsx (Batch 1) + useSortable aus @dnd-kit/sortable. transform-style bleibt (DnD-Pflicht, maxInline=1, eslint-disable). Story in <DndContext>.' },
  { batch: 2, name: 'SubTaskRow', mode: 'harvest', source: 'src/components/itemDetail/SubTaskRow.jsx', maxInline: 1, dnd: true,
    note: 'Subtask-Zeile, dnd-kit useSortable + Grip-Handle. backlog_id-Daten als Prop, onToggle/onDelete-Callbacks. transform-style bleibt (DnD). 7× style -> 1 DnD + Rest Token. Story in <DndContext>.' },
  { batch: 2, name: 'SortableTodoItem', mode: 'harvest', source: 'src/components/projectHome/SortableTodoItem.jsx', maxInline: 1, dnd: true,
    note: 'Todo-Zeile mit Checkbox + Drag-Handle + Confirm-Delete. useSortable. Importiere ../atoms/IssuePill.jsx. Daten als Props, onToggle/onDelete/onPatch-Callbacks, useConfirmDialog -> stattdessen onDelete-Callback (Confirm im Screen). transform-style bleibt. Story in <DndContext>.' },
  { batch: 2, name: 'CancelledColumn', mode: 'harvest', source: 'src/components/sprintBoard/CancelledColumn.jsx', maxInline: 0,
    note: 'Collapse-Spalte für gecancelte Issues (variant-prop, Collapse-Toggle). items als Prop, onSelect/onToggleMulti-Callbacks. Importiere ./IssueCard.jsx oder ./SortableIssueCard.jsx. collapse-State bleibt. 3× style -> Tailwind.' },
  { batch: 2, name: 'NotesPanel', mode: 'harvest', source: 'src/components/NotesPanel.jsx', maxInline: 0,
    note: 'Notiz-Panel + Auto-Save. value als Prop, onSave-Callback (Auto-Save-Debounce-Timer lokal OK, fetch raus). Importiere Textarea. 6× style -> Panel-Klassen.' },
  { batch: 2, name: 'RelevantFilesPicker', mode: 'harvest', source: 'src/components/RelevantFilesPicker.jsx', maxInline: 0,
    note: 'File-Picker für relevant_files + Highlight. files/value als Props, onChange-Callback. Importiere Input/Pill. 8× style -> Picker-Klassen.' },
  { batch: 2, name: 'AddLinkPicker', mode: 'harvest', source: 'src/components/projectHome/AddLinkPicker.jsx', maxInline: 0,
    note: '4-Typen-Link-Picker + Client-Validierung (Issue-Key). Importiere ../atoms/OptIcon.jsx + Input + Button. PRESENTATIONAL: addLink-API ENTFERNEN -> onAdd(link)-Callback. Submit/Validierungs-State (useState) bleibt. 9× style -> Token.' },
  { batch: 2, name: 'TodoLinksList', mode: 'harvest', source: 'src/components/projectHome/TodoLinksList.jsx', maxInline: 0,
    note: 'Link-Liste mit Typ-Icon-Farben + Remove + Issue-Click. Importiere ../atoms/TypeIcon.jsx + ../molecules/LinkRow.jsx. links als Prop, onRemoveLink/onIssueClick-Callbacks. 8× style -> Token.' },
  { batch: 2, name: 'FeedbackPopover', mode: 'harvest', source: 'src/components/FeedbackPopover.jsx', maxInline: 0,
    note: 'Popover-Feedback-Form (review_feedback). PRESENTATIONAL: write-API ENTFERNEN -> onSubmit(feedback)-Callback. Popover -> PopoverPanel, Form-State bleibt. Importiere Textarea/Button. 9× style -> Token.' },
  { batch: 2, name: 'AiSummaryModal', mode: 'harvest', source: 'src/components/AiSummaryModal.jsx', maxInline: 0,
    note: 'AI-Summary-Modal. PRESENTATIONAL: AI/Summary-API + stream-state ENTFERNEN -> summary (string) + streaming (bool) als Props, onGenerate/onClose-Callbacks. Modal -> ../molecules/Modal.jsx. 1× style -> Token.' },
  { batch: 2, name: 'ArchonLogPanel', mode: 'harvest', source: 'src/components/ArchonLogPanel.jsx', maxInline: 0,
    note: 'Archon-Log-Render. PRESENTATIONAL: WebSocket/useArchonRunStream ENTFERNEN -> logs=[] (Zeilen) + connected (bool) als Props. Reines Log-Render. 2× style -> Token.' },
  { batch: 2, name: 'BulkBar', mode: 'harvest', source: 'src/components/BulkBar.jsx', maxInline: 0,
    note: 'Bulk-Action-Leiste auf Issues. selectedCount/availableActions als Props, onAction-Callbacks (dispatch raus). BulkActionButton inline als Button-Komposition (../atoms/Button.jsx). 17× style -> Token. Importiere StickyActionBar evtl.' },

  // ===== BATCH 3 — CRUD-Karten (presentational) + Milestone-Editoren =====
  { batch: 3, name: 'ApiKeysCard', mode: 'harvest', source: 'src/components/settings/ApiKeysCard.jsx', maxInline: 0,
    note: 'ApiKey-CRUD-Card. PRESENTATIONAL: useState(keys)+fetch ENTFERNEN -> keys=[] Prop, onCreate/onDelete/onUpdate-Callbacks. Edit-Toggle/Form-Draft-State (useState) bleibt. Importiere Card/CardHead/Input/Button. 15× style -> Tailwind.' },
  { batch: 3, name: 'ProjectMetadataCard', mode: 'harvest', source: 'src/components/settings/ProjectMetadataCard.jsx', maxInline: 0,
    note: 'Project-Metadaten-CRUD-Card (größter style-Block 37). PRESENTATIONAL: fetch raus -> project Prop + onSave-Callback, Edit-Toggle-State bleibt. 3× raw-hex (#cba6f7 Default + hex-ok-Kommentar) -> CSS-Var --accent-primary / Token. Importiere Card/CardHead/Input/Button. 37× style -> Tailwind.' },
  { batch: 3, name: 'TagsCard', mode: 'harvest', source: 'src/components/settings/TagsCard.jsx', maxInline: 0,
    note: 'Tag-CRUD-Card + optimistisches Update. PRESENTATIONAL: fetch raus -> tags=[] Prop, onCreate/onDelete/onUpdate-Callbacks; optimistic-State lokal OK. Importiere Card/CardHead/Pill/Input/Button. 17× style -> Tailwind.' },
  { batch: 3, name: 'SstdCard', mode: 'harvest', source: 'src/components/settings/SstdCard.jsx', maxInline: 0,
    note: 'SSTD-CRUD-Card. PRESENTATIONAL: fetch raus -> content Prop + onSave-Callback, Edit-Toggle bleibt. Importiere Card/CardHead/Textarea/Button. 11× style -> Tailwind.' },
  { batch: 3, name: 'TesterLinkCard', mode: 'harvest', source: 'src/components/settings/TesterLinkCard.jsx', maxInline: 0,
    note: 'Tester-Link-CRUD-Card + Clipboard-Copy. PRESENTATIONAL: fetch raus -> links=[] Prop, onCreate/onDelete-Callbacks; Clipboard-Copy (navigator) lokal OK. Importiere Card/CardHead/Input/Button. 11× style -> Tailwind.' },
  { batch: 3, name: 'ActionBar', mode: 'harvest', source: 'src/components/itemDetail/ActionBar.jsx', maxInline: 0,
    note: 'Issue-Status-Transition-Leiste (forward/backward, canCancel, statusError). status/canCancel als Props, onTransition-Callback. TransitionButton inline als Button-Komposition (../atoms/Button.jsx). Importiere Cluster. 13× style -> Token.' },
  { batch: 3, name: 'MilestoneDodEditor', mode: 'harvest', source: 'src/components/MilestoneDodEditor.jsx', maxInline: 0,
    note: 'DoD-Criteria-Editor. criteria=[] als Prop, onChange/onToggle-Callbacks. Importiere Input/Button/Pill. 9× style + 1× raw-hex -> Token.' },
  { batch: 3, name: 'MilestoneDependencyEditor', mode: 'harvest', source: 'src/components/MilestoneDependencyEditor.jsx', maxInline: 0,
    note: 'issue_dependencies-Editor. deps=[]/candidates=[] als Props, onAdd/onRemove-Callbacks, fetch raus. DependencyBadge inline als Pill-Komposition. Importiere Select/Pill/IconButton. 15× style -> List-Klassen.' },
  { batch: 3, name: 'MilestoneCloseDialog', mode: 'harvest', source: 'src/components/MilestoneCloseDialog.jsx', maxInline: 0,
    note: 'Milestone-Status-Transition-Dialog + Transition-Guard. milestone als Prop, onConfirm/onCancel-Callbacks. Modal -> ../molecules/Modal.jsx. Clean (0 style erwartet).' },
  { batch: 3, name: 'MilestoneForm', mode: 'harvest', source: 'src/components/milestone/MilestoneForm.jsx', maxInline: 0,
    note: 'Milestone-Formular (deferred/target_date, ESC/Cmd+S Shortcuts, chrome-Prop, Defer-Toggle). PRESENTATIONAL: PUT/PATCH raus -> milestone Prop + onSubmit-Callback. Form-State + Keyboard-Handler bleiben. Importiere Input/Textarea/Button. Clean (0 style).' },
  { batch: 3, name: 'MilestoneSwimlane', mode: 'harvest', source: 'src/components/MilestoneSwimlane.jsx', maxInline: 0,
    note: 'Swimlane-Grid für Milestone-Cards. milestones=[] als Prop. Importiere Grid/MilestonePill/Card. 9× style -> Grid-Token.' },
  { batch: 3, name: 'ProjectQuickSwitcher', mode: 'harvest', source: 'src/components/ProjectQuickSwitcher.jsx', maxInline: 0,
    note: 'Projekt-Picker (Fuzzy-Search + Keyboard-Nav). PRESENTATIONAL: projectStore/localStorage raus -> projects=[]/value als Props, onSelect-Callback. Search/active-State bleibt. Importiere Input/PopoverPanel. Clean (0 style).' },

  // ===== BATCH 4 — Composites (komponieren B1-Organisms) + Master-Detail =====
  { batch: 4, name: 'SprintColumn', mode: 'harvest', source: 'src/components/sprintBoard/SprintColumn.jsx', maxInline: 1, dnd: true,
    note: 'Komponiert ./SprintHeader.jsx (B1) + ../molecules/DroppableColumn.jsx + ./SortableIssueCard.jsx (B2) Liste. hideCompleted-Filter. sprint/items als Props, Callbacks. 1× style -> evtl DnD. Story in <DndContext>.' },
  { batch: 4, name: 'DetailsTabContent', mode: 'harvest', source: 'src/components/itemDetail/DetailsTabContent.jsx', maxInline: 0,
    note: 'Issue-Detail-Tab (EditableSection-Muster, MetaBlock, Attachments, Todo). Größter style-Block (33). PRESENTATIONAL: API-Mutationen raus -> Daten Props + onSave/onUpload-Callbacks. Importiere ./EditableSection.jsx (B1) + ../atoms/MetaBlock.jsx + ../molecules/AttachmentDropzone.jsx. 33× style -> Token.' },
  { batch: 4, name: 'ReviewsTabContent', mode: 'harvest', source: 'src/components/itemDetail/ReviewsTabContent.jsx', maxInline: 0,
    note: 'Review-Runden-Tab (Verdict passed/rejected, round_number). reviews=[] als Prop, onReview-Callback, fetch raus. ReviewRoundCard inline als Card-Komposition (../atoms/Card.jsx + StatusBadge). 10× style -> Token.' },
  { batch: 4, name: 'TasksDepsTabContent', mode: 'harvest', source: 'src/components/itemDetail/TasksDepsTabContent.jsx', maxInline: 1, dnd: true,
    note: 'Tasks/Dependencies-Tab (blocked_by/blocks, DnD-Tasks). PRESENTATIONAL: fetch(deps) raus -> tasks/deps als Props, Callbacks. DependencyRow inline (dupliziert -> vereinheitlichen). Importiere ./SubTaskRow.jsx (B2)? oder eigene. 21× style -> Token. Story in <DndContext>.' },
  { batch: 4, name: 'ProjectHomeTabs', mode: 'harvest', source: 'src/components/projectHome/ProjectHomeTabs.jsx', maxInline: 0,
    note: 'Tab-Leiste (todo/backlog/sstd, Badge-Counts, MobileTabBar). Importiere ../atoms/TabButton.jsx + ../atoms/TabIcon.jsx. tabs/active/counts als Props, onChange-Callback. 8× style -> Token.' },
  { batch: 4, name: 'ProjectTodoList', mode: 'harvest', source: 'src/components/projectHome/ProjectTodoList.jsx', maxInline: 1, dnd: true,
    note: 'Todo-Liste mit DndContext+SortableContext+arrayMove. todos=[] als Prop, onReorder/onPatch-Callbacks, fetch raus. Importiere ./SortableTodoItem.jsx (B2) + EmptyState. Provider DndContext bleibt INTERN (kein extra Decorator nötig, aber Story trotzdem safe wrappen). 3× style -> Token.' },
  { batch: 4, name: 'SettingsSidebar', mode: 'harvest', source: 'src/components/projectHome/SettingsSidebar.jsx', maxInline: 0,
    note: 'Settings-Sidebar (MetaCard, TodoPreview-Badge, Dependency-Liste, 4 Card-Sektionen). PRESENTATIONAL: 5 API-Calls raus -> Daten Props + Callbacks. Importiere ../molecules/MetaCard.jsx + ./TodoPreviewSection.jsx (B1). 12× style -> Token.' },
  { batch: 4, name: 'ProjectionSection', mode: 'extract', source: 'src/components/projectHome/tabs/SstdTab.jsx', exportName: 'ProjectionSection', maxInline: 0,
    note: 'SSTD-Projektion (Todos/Journal, render-only Markdown, collapsible). content als Prop. Importiere ../molecules/MarkdownField.jsx (Preview-Modus) oder reines Render. Clean (0 style erwartet).' },
  { batch: 4, name: 'SlotSection', mode: 'extract', source: 'src/components/projectHome/tabs/SstdTab.jsx', exportName: 'SlotSection', maxInline: 0,
    note: 'SSTD-Slot Edit/Save/Cancel-State-Machine (slotKey). PRESENTATIONAL: setSstdSlot-API raus -> content Prop + onSave-Callback. Edit-State (useState) bleibt. Importiere Textarea/Button. Clean (0 style erwartet).' },
  { batch: 4, name: 'IconSidebar', mode: 'harvest', source: 'src/components/IconSidebar.jsx', maxInline: 0,
    note: 'Nav-Icon-Sidebar + aktiver Link. PRESENTATIONAL: Route-Kopplung aufweichen -> items=[]/activeKey als Props, onNavigate-Callback. Importiere IconButton/Tooltip. Clean (0 style).' },
  { batch: 4, name: 'LivePreview', mode: 'harvest', source: 'src/components/LivePreview.jsx', maxInline: 1,
    note: 'iframe + Klick-Annotation (ui_target). src/pins als Props, onPin-Callback. Overlay/Pin via ../molecules/PreviewOverlay.jsx + ../atoms/... iframe-Dimension runtime -> maxInline=1 (eslint-disable). 10× style -> 1 + Rest Token.' },
  { batch: 4, name: 'MemoryMasterDetail', mode: 'harvest', source: 'src/components/memory/MemoryMasterDetail.jsx', maxInline: 0,
    note: 'Master-Detail-Panel (List+Detail+Form). items/selected als Props, onSelect/onSave-Callbacks, fetch raus. Importiere ../templates/MasterDetail? NEIN (Template Phase 4) -> nutze ../molecules/ + atoms. Clean (0 style erwartet).' },

  // ===== BATCH 5 — Modals + Page-Skeletons + Defer =====
  { batch: 5, name: 'IssueCreateModal', mode: 'harvest', source: 'src/components/IssueCreateModal.jsx', maxInline: 0,
    note: 'Issue-Erstell-Formular-Modal + Validierung. PRESENTATIONAL: API-Call raus -> onCreate(issue)-Callback. Form-State (useIssueForm-Logik) bleibt lokal. Modal -> ../molecules/Modal.jsx, Input/Textarea/Select/Button. Clean (0 style).' },
  { batch: 5, name: 'ProjectCreateModal', mode: 'harvest', source: 'src/components/ProjectCreateModal.jsx', maxInline: 0,
    note: 'Projekt-Erstell-Modal (Prefix/Slug-Gen). PRESENTATIONAL: API raus -> onCreate-Callback, Form-State bleibt. 6× raw-hex -> Token (Color-Picker-Defaults -> CSS-Var/Const). Modal -> ../molecules/Modal.jsx.' },
  { batch: 5, name: 'SprintFormModal', mode: 'harvest', source: 'src/components/SprintFormModal.jsx', maxInline: 0,
    note: 'Sprint-CRUD-Formular-Modal + Datum-Picker. PRESENTATIONAL: API raus -> sprint Prop + onSubmit-Callback. Modal -> ../molecules/Modal.jsx, Input/Button. Clean (0 style).' },
  { batch: 5, name: 'SprintOrderOverlay', mode: 'harvest', source: 'src/components/SprintOrderOverlay.jsx', maxInline: 1, dnd: true,
    note: 'DnD-Reorder-Overlay für Sprint-Reihenfolge. sprints=[] als Prop, onReorder-Callback. useSortable/DnD transform-style bleibt. Clean sonst. Story in <DndContext>.' },
  { batch: 5, name: 'MilestoneCreateModal', mode: 'harvest', source: 'src/components/milestone/MilestoneCreateModal.jsx', maxInline: 0,
    note: 'DEFER (Molecule->Organism). Komponiert ./MilestoneForm.jsx (B3) + Modal. FormPage (Template, Phase 4) NICHT verfügbar -> stattdessen ../molecules/Modal.jsx direkt wrappen (FormPage ist nur dünner Modal-Variant-Wrapper; im JSDoc notieren). onCreate-Callback. Clean (0 style).' },
  { batch: 5, name: 'BoardPage', mode: 'harvest', source: 'src/components/ui/BoardPage.jsx', maxInline: 0,
    note: 'Board-Gerüst (Spalten/Swimlane-Slots, Toolbar-Fallback). TIER-RECHECK: vorschreibendes Layout-Gerüst mit Sprint/Board-Bezug — falls reine Layout-Slots ohne Domänen-Logik, flagge SHOULD_BE_TEMPLATE (baue trotzdem). Slot-Props. Clean (0 style).' },
  { batch: 5, name: 'DashboardPage', mode: 'harvest', source: 'src/components/ui/DashboardPage.jsx', maxInline: 0,
    note: 'KPI-Dashboard-Skelett (PageShell+Grid+Card-Komposit). TIER-RECHECK: wenn reines Layout-Komposit ohne Domäne, flagge SHOULD_BE_TEMPLATE (baue trotzdem). Importiere Grid/Card. Clean (0 style).' },
  { batch: 5, name: 'TodoDetailModal', mode: 'harvest', source: 'src/components/projectHome/TodoDetailModal.jsx', maxInline: 0,
    note: 'Todo-Detail-Modal (Auto-Grow, Status-Toggle, Links+AddLinkPicker). PRESENTATIONAL: onPatch-API -> Callback, 5×useState+3×useEffect UI-State bleibt. Modal -> ../molecules/Modal.jsx, importiere ./AddLinkPicker.jsx (B2). Clean (0 inline nach DD-451).' },
]

const BATCH = Number(args?.batch ?? 1)
const items = ORGANISMS.filter((o) => o.batch === BATCH)
if (items.length === 0) {
  log(`Batch ${BATCH} leer — gültig 1..5.`)
  return { error: `no organisms in batch ${BATCH}` }
}

phase('Build')
log(`Phase 3 Batch ${BATCH}: ${items.length} Organisms — ${items.map((o) => o.name).join(', ')}`)

const results = await pipeline(
  items,
  (o) => agent(
    `${CONVENTIONS}\n\nAUFGABE — Organism "${o.name}" (mode=${o.mode}, maxInline=${o.maxInline}${o.dnd ? ', DnD=ja' : ''}):\n` +
    `QUELLE: ${o.source}${o.exportName ? ` — extrahiere den Export/Inline-Komponente "${o.exportName}" daraus` : ''}\n` +
    `${o.note}\n\n` +
    `Schritte: (1) Quell-Datei lesen.${o.exportName ? ` Finde die Definition von "${o.exportName}".` : ''} ` +
    `(2) PRESENTATIONAL umbauen: fetch/useEffect-Datenladen/Store/API ENTFERNEN, Daten als Props, Mutationen als Callback-Props; ephemeren UI-State (useState/useRef/Outside-Click/Keyboard) behalten. ` +
    `(3) Prüfe welche ../atoms/ + ../molecules/ (+ ./<Organism>.jsx aus früheren Batches) du importieren kannst (lies sie kurz für die API) und verdrahte sie statt inline neu zu bauen. ` +
    `(4) organisms/${o.name}.jsx schreiben (Write) — kanonisches Muster, JSDoc mit gehobener Kopplung, dataUiScope-Prop (Default kebab '${o.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}'), gepunktetes data-ui via dataUiScope, token-clean, Atoms/Molecules importiert. ` +
    `(5) organisms/${o.name}.stories.jsx schreiben (Write) — title 'Organisms/${o.name}', realistische MOCK-Props inline, Callbacks no-op${o.dnd ? ', Render in <DndContext> gewrappt (import { DndContext } from "@dnd-kit/core")' : ''}. ` +
    `(6) Selbst messen: \`grep -c 'style=' src/components/ui/organisms/${o.name}.jsx\` (MUSS <= ${o.maxInline}; nur echt runtime-dynamische mit eslint-disable) und \`grep -cE '#[0-9a-fA-F]{3,8}' src/components/ui/organisms/${o.name}.jsx\` (MUSS 0). Sonst nachbessern. ` +
    `${o.maxInline > 0 ? `(6b) Für den dynamischen style: eslint laufen, exakte Rule-ID (react/forbid-dom-props) ablesen, eslint-disable-next-line + Begründung setzen.` : ''} ` +
    `(7) \`npx eslint src/components/ui/organisms/${o.name}.jsx src/components/ui/organisms/${o.name}.stories.jsx --max-warnings=0\` MUSS exit 0 (Story: useState/Hooks nur in benannter Komponente, nicht in anonymer render-Fn; no-undef bei MOCK-Konstanten prüfen). ` +
    `Gib componentPath/storyPath + atomsImported + moleculesImported + liftedCoupling + tierFlag + gemessene Counts zurück.`,
    { label: `build:${o.name}`, phase: 'Build', schema: BUILD_SCHEMA }
  ),
  (build, o) => agent(
    `${CONVENTIONS}\n\nADVERSARIALER VERIFY für Organism "${o.name}" (maxInline=${o.maxInline}). Repo-Root ${ROOT}.\n` +
    `Build meldete: ${build?.summary}\n- Komponente: ${build?.componentPath}\n- Story: ${build?.storyPath}\n- tierFlag: ${build?.tierFlag}\n\n` +
    `Führe AUS, urteile streng (Self-Report NICHT vertrauen):\n` +
    `1. eslintPass: \`npx eslint ${build?.componentPath} ${build?.storyPath} --max-warnings=0\` -> exit 0? (Story: keine Hooks in anonymer render-Fn.)\n` +
    `2. inlineStyleCount: \`grep -c 'style=' ${build?.componentPath}\` -> inlineWithinBudget = (count <= ${o.maxInline})? ACHTUNG: auch single-brace style={varObj} zählt; jeder verbleibende muss ECHT runtime-dynamisch sein UND eslint-disable tragen.\n` +
    `3. rawHexZero: \`grep -cE '#[0-9a-fA-F]{3,8}' ${build?.componentPath}\` == 0?\n` +
    `4. storyExists: default {title:'Organisms/${o.name}'} + mind. 1 named export?\n` +
    `5. dataUiScopeOk: \`grep -c 'dataUiScope' ${build?.componentPath}\` >= 1 (Prop existiert + wird im Wurzel-data-ui genutzt, KEIN hardcoded Domänen-bereich wie backlog./sprint-detail./milestones. in der Datei)?\n` +
    `verdict=PASS nur wenn alle fünf true. Sonst FAIL + konkrete issues. Nur prüfen, nichts beheben.`,
    { label: `verify:${o.name}`, phase: 'Verify', schema: VERIFY_SCHEMA }
  )
)

const flat = results.filter(Boolean)
const pass = flat.filter((r) => r?.verdict === 'PASS')
const fail = flat.filter((r) => r?.verdict !== 'PASS')

log(`Batch ${BATCH} fertig: ${pass.length}/${items.length} PASS`)

return {
  batch: BATCH,
  total: items.length,
  passed: pass.map((r) => r.component),
  failed: fail.map((r) => ({ component: r?.component, issues: r?.issues })),
  details: flat,
}
