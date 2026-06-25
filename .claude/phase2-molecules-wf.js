export const meta = {
  name: 'phase2-molecules',
  description: 'Storybook-Canonical Phase 2: 17 generische Molecules token-clean nach src/components/ui/molecules/ (harvest + 3 Extraktionen), komponieren kanonische Atoms aus ../atoms/; adversarialer Verify pro Molecule.',
  phases: [
    { title: 'Build', detail: '17 Molecules: Komponente + Story, importiert ../atoms/, 0 inline-style (PreviewOverlay maxInline=1)' },
    { title: 'Verify', detail: 'pro Molecule: eslint max-warnings=0, inline<=maxInline, rawHex==0, Story-title korrekt' },
  ],
}

const ROOT = '/Users/erik/Obsidian/tools/DeveloperDashboard'

const CONVENTIONS = `
KONTEXT — DevDashboard React 19 + Tailwind v4 + Catppuccin (Latte hell / Macchiato dunkel).
Arbeite vom Repo-Root: ${ROOT}

KANONISCHE LIBRARY — Stufe-2 Greenfield+Harvest, ADDITIV:
- Neue Datei schreiben nach src/components/ui/molecules/<Name>.jsx (Tier-Namespace, neu anlegen falls nicht da).
- Story daneben: src/components/ui/molecules/<Name>.stories.jsx, Story-title = 'Molecules/<Name>'.
- ALTE Quell-Datei NICHT anfassen/löschen, KEINE Screen-Imports umbiegen, Barrel index.js NICHT ändern. Rein additiv. Screens migrieren erst in Phase 5.

MOLECULE-TIER:
- Molecule = komponiert >=2 Atoms/Elemente zu wiederverwendbarer Einheit. KEINE Domänen-Begriffe (Sprint/Issue/Milestone/Todo) in der LOGIK — generische Props.
- WIEDERVERWENDUNG: wo das Molecule ein bereits gebautes Atom enthält, IMPORTIERE es aus ../atoms/ statt es inline neu zu bauen. Verfügbare kanonische Atoms in src/components/ui/atoms/:
  Button, IconButton, Input, Textarea, Pill, Card, CardHead, MetaRow, MetaBlock, Ico, TypeIcon, OptIcon, TabIcon, TabButton, IssuePill, MilestonePill, SprintPill, StatusBadge, Modal, PopoverPanel, StickyActionBar, Tooltip, Cluster, Stack, Grid, Sidebar, EmptyState? (NEIN, EmptyState ist Molecule), typeIcons, Placeholders.
  -> z.B. LinkRow importiert ../atoms/TypeIcon.jsx + ../atoms/IconButton.jsx; MetaCard importiert ../atoms/CardHead.jsx + ../atoms/MetaRow.jsx; FilterPopover/MetaPill delegieren an ../atoms/PopoverPanel.jsx; EmptyState nutzt ../atoms/Button.jsx.

KANONISCHES MUSTER (wie atoms/Button.jsx, atoms/Pill.jsx — lies eine als Vorlage falls unsicher):
- default export function <Name>(props), JSDoc-Proptypes-Kommentar darüber.
- Variant/Size als STATISCHE Klassen-Maps (const VARIANT={...}), KEINE String-Interpolation im Token (Tailwind-JIT muss Klassen literal sehen).
- Props-driven: kein Store, kein Fetch. Wurzel-Element: data-ui="<name-kebab>" (DD#61).

TOKEN-CLEAN (style={{}} -> Tailwind v4 arbitrary):
- background:'var(--accent-primary)' -> bg-[var(--accent-primary)]; color:'var(--on-accent)' -> text-[var(--on-accent)]; bg-[var(--surface1)]
- color-mix: bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] (Spaces -> Unterstrich!)
- feste px via Map auf Tailwind-Klassen; disabled via Klassen 'disabled:opacity-50 disabled:cursor-not-allowed'; Radius rounded/rounded-lg/rounded-md.
Tokens: --accent-{primary,success,danger,warning,info}, --surface{0,1,2}, --text, --subtext{0,1}, --on-accent, --radius-{sm,md,lg,xl}.

DYNAMISCHE-STYLE-AUSNAHME (NUR wenn maxInline>0):
- EIN echt runtime-dynamischer style={...} (z.B. Klick-/Cursor-Position) darf bleiben. Darüber: \`// eslint-disable-next-line react/forbid-dom-props -- <Begründung>\` (exakte Rule-ID via eslint verifizieren). Alle statischen Styles trotzdem -> Tailwind.

DND-STORIES: nutzt das Molecule @dnd-kit-Hooks (useDroppable/useSortable), MUSS die Story-Render in einen <DndContext>-Decorator gewrappt sein, sonst crasht sie. Importiere DndContext aus '@dnd-kit/core'.

HARVEST = verlustfrei (gleiche API + Verhalten). EXTRACT = benannte Inline-Sub-Komponente aus Multi-Export-File herausziehen, verlustfrei, Domänen-Bezug entfernen (props-driven).

STORY: default export { title:'Molecules/<Name>', component }, named exports Default + relevante Varianten/States. KEIN inline-style, KEIN Roh-Hex in der Story.
`

const BUILD_SCHEMA = {
  type: 'object',
  required: ['component', 'componentPath', 'storyPath', 'inlineStyleCount', 'rawHexCount', 'summary'],
  properties: {
    component: { type: 'string' }, componentPath: { type: 'string' }, storyPath: { type: 'string' },
    inlineStyleCount: { type: 'number' }, rawHexCount: { type: 'number' },
    atomsImported: { type: 'array', items: { type: 'string' } },
    variantsCovered: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['component', 'eslintPass', 'inlineWithinBudget', 'rawHexZero', 'storyExists', 'verdict'],
  properties: {
    component: { type: 'string' }, eslintPass: { type: 'boolean' }, inlineWithinBudget: { type: 'boolean' },
    inlineStyleCount: { type: 'number' }, rawHexZero: { type: 'boolean' }, storyExists: { type: 'boolean' },
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, issues: { type: 'array', items: { type: 'string' } },
  },
}

const MOLECULES = [
  { name: 'Breadcrumb', mode: 'harvest', source: 'src/components/Breadcrumb.jsx', maxInline: 0,
    note: `Nav-Pfad aus Link-Items (items als Prop-Array {label,href?,onClick?}). 2× style -> Tailwind. Story: Default, mit/ohne letztem aktivem Segment.` },
  { name: 'EmptyState', mode: 'harvest', source: 'src/components/ui/EmptyState.jsx', maxInline: 0,
    note: `Komponiert Icon+Titel+Beschreibung+Action. Action-Button via ../atoms/Button.jsx. 3× style -> Tailwind. Story: Default, WithAction, IconOnly.` },
  { name: 'InlineEdit', mode: 'harvest', source: 'src/components/ui/InlineEdit.jsx', maxInline: 0,
    note: `Editierbares Feld (input/span toggle). toggle-State+data-ui behalten. Input via ../atoms/Input.jsx wo sinnvoll. 3× style -> Tailwind. Story: Display, Editing.` },
  { name: 'SegmentedControl', mode: 'harvest', source: 'src/components/ui/SegmentedControl.jsx', maxInline: 0,
    note: `>=2 Buttons zu Radiogroup. aria+size-Map behalten. 2× style -> Tailwind. Story: Default, Sizes, mehrere Optionen.` },
  { name: 'Tabs', mode: 'harvest', source: 'src/components/Tabs.jsx', maxInline: 0,
    note: `Generische Tab-Leiste (props tabs+active+onChange). 3× style -> Tailwind. Story: Default, mit Count-Badges.` },
  { name: 'MetaPill', mode: 'harvest', source: 'src/components/ui/MetaPill.jsx', maxInline: 0,
    note: `Button+Dropdown-Optionsliste, generisch label/value. Outside-Click-Hook behalten. Dropdown -> ../atoms/PopoverPanel.jsx delegieren. 3× style -> Tailwind. Story: Default, Open.` },
  { name: 'FilterPopover', mode: 'harvest', source: 'src/components/ui/FilterPopover.jsx', maxInline: 0,
    note: `Trigger-Button + Popover-Slot. Trigger via ../atoms/Button.jsx oder IconButton, Popover -> ../atoms/PopoverPanel.jsx delegieren. Count-Badge. 6× style -> Tailwind. Story: Default, WithCount, Open.` },
  { name: 'MarkdownField', mode: 'harvest', source: 'src/components/MarkdownField.jsx', maxInline: 0,
    note: `Edit/Preview-Toggle, generisch (value+onChange). Textarea via ../atoms/Textarea.jsx. 1× style -> Tailwind. Story: Edit, Preview.` },
  { name: 'ShortcutsHelp', mode: 'harvest', source: 'src/components/ShortcutsHelp.jsx', maxInline: 0,
    note: `Statische Shortcut-Tabelle (shortcuts als Prop). Clean (0 style). Story: Default.` },
  { name: 'TagMultiSelect', mode: 'harvest', source: 'src/components/TagMultiSelect.jsx', maxInline: 0,
    note: `Generisches Tag-Multi-Select (options+selected+onChange). Tag-Render via ../atoms/Pill.jsx wo passend. 11× style -> Tailwind (höchster Block). Story: Empty, MitAuswahl.` },
  { name: 'Select', mode: 'harvest', source: 'src/components/ui/Select.jsx', maxInline: 0,
    note: `Trigger+Dropdown+Suchfeld (options+value+onChange). Such-Input via ../atoms/Input.jsx, Dropdown-Shell -> ../atoms/PopoverPanel.jsx. Check+Hint behalten. 10× style -> Tailwind (höchster Block). Story: Default, Searchable, Open.` },
  { name: 'AttachmentDropzone', mode: 'harvest', source: 'src/components/AttachmentDropzone.jsx', maxInline: 0,
    note: `Upload-UI + Vorschau, generisch (onFiles callback). 5× style -> Tailwind. Story: Empty, MitVorschau, DragOver.` },
  { name: 'PreviewToolbar', mode: 'harvest', source: 'src/components/PreviewToolbar.jsx', maxInline: 0,
    note: `Viewport-Preset-Buttons (presets+active+onSelect). Buttons via ../atoms/Button.jsx/IconButton. 6× style -> Toolbar-Klassen. Story: Default.` },
  { name: 'PreviewOverlay', mode: 'harvest', source: 'src/components/PreviewOverlay.jsx', maxInline: 1,
    note: `Overlay für iframe-Klick-Capture (onCapture). Klick-Position ist runtime-dynamisch -> EIN style erlaubt (eslint-disable). Rest -> Tailwind. Story: Default.` },
  { name: 'DroppableColumn', mode: 'extract', source: 'src/components/sprintBoard/primitives.jsx', exportName: 'DroppableColumn', maxInline: 0,
    note: `Generischer @dnd-kit useDroppable-Wrapper (id+children, isOver-Toggle). KEINE Sprint/Issue-Domäne — id ist generischer String-Prop. style-Prop darf durchgereicht werden (kein Literal). Story MUSS in <DndContext> gewrappt sein. Story: Default, IsOver.` },
  { name: 'LinkRow', mode: 'extract', source: 'src/components/projectHome/TodoLinksList.jsx', exportName: 'LinkRow', maxInline: 0,
    note: `Komponiert ../atoms/TypeIcon.jsx + Label + Remove-Button (../atoms/IconButton.jsx). Props: { type, label, href?, onRemove? }. KEIN Todo/Issue-State. Story: Default, mit Remove.` },
  { name: 'MetaCard', mode: 'extract', source: 'src/components/projectHome/SettingsSidebar.jsx', exportName: 'MetaCard', maxInline: 0,
    note: `Komponiert ../atoms/CardHead.jsx + ../atoms/MetaRow.jsx-Liste. Props: { icon?, title, rows: [{label,value}] }. Story: Default mit mehreren Rows.` },
]

phase('Build')

const results = await pipeline(
  MOLECULES,
  (m) => agent(
    `${CONVENTIONS}\n\nAUFGABE — Molecule "${m.name}" (mode=${m.mode}, maxInline=${m.maxInline}):\n` +
    `QUELLE: ${m.source}${m.exportName ? ` — extrahiere die Inline-Komponente/Export "${m.exportName}" daraus` : ''}\n` +
    `${m.note}\n\n` +
    `Schritte: (1) Quell-Datei lesen.${m.mode === 'extract' ? ` Finde die Inline-Definition von "${m.exportName}".` : ''} ` +
    `(2) Prüfe welche der genannten ../atoms/-Komponenten du importieren kannst (lies sie kurz für die API) und verdrahte sie statt inline neu zu bauen. ` +
    `(3) molecules/${m.name}.jsx schreiben (Write) — kanonisches Muster, data-ui, token-clean, Atoms importiert. ` +
    `(4) molecules/${m.name}.stories.jsx schreiben (Write) — title 'Molecules/${m.name}'${m.name === 'DroppableColumn' ? ', Render in <DndContext> gewrappt' : ''}. ` +
    `(5) Selbst messen: \`grep -c 'style=' src/components/ui/molecules/${m.name}.jsx\` (Inline-style-Attribute, MUSS <= ${m.maxInline}; style-Prop-Spread zählt nicht als Literal) und \`grep -cE '#[0-9a-fA-F]{3,8}'\` (MUSS 0). Sonst nachbessern. ` +
    `${m.maxInline > 0 ? `(5b) Falls dynamischer style bleibt: eslint laufen, exakte Rule-ID ablesen, eslint-disable-next-line + Begründung setzen.` : ''} ` +
    `(6) \`npx eslint src/components/ui/molecules/${m.name}.jsx src/components/ui/molecules/${m.name}.stories.jsx --max-warnings=0\` MUSS exit 0 (achte auf react-hooks/rules-of-hooks in der Story: useState nur in benannter Komponente, nicht in anonymer render-Fn). ` +
    `Gib componentPath/storyPath + atomsImported + gemessene Counts zurück.`,
    { label: `build:${m.name}`, phase: 'Build', schema: BUILD_SCHEMA }
  ),
  (build, m) => agent(
    `${CONVENTIONS}\n\nADVERSARIALER VERIFY für Molecule "${m.name}" (maxInline=${m.maxInline}). Repo-Root ${ROOT}.\n` +
    `Build meldete: ${build?.summary}\n- Komponente: ${build?.componentPath}\n- Story: ${build?.storyPath}\n\n` +
    `Führe AUS, urteile streng (Self-Report NICHT vertrauen):\n` +
    `1. eslintPass: \`npx eslint ${build?.componentPath} ${build?.storyPath} --max-warnings=0\` -> exit 0? (Story: keine Hooks in anonymer render-Fn.)\n` +
    `2. inlineStyleCount: \`grep -c 'style=' ${build?.componentPath}\` -> inlineWithinBudget = (count <= ${m.maxInline})? ACHTUNG: auch single-brace style={varObj} zählt; jeder verbleibende muss ECHT runtime-dynamisch sein UND eslint-disable tragen. style-Prop-Durchreiche (spread) ist KEIN Literal.\n` +
    `3. rawHexZero: \`grep -cE '#[0-9a-fA-F]{3,8}' ${build?.componentPath}\` == 0?\n` +
    `4. storyExists: default {title:'Molecules/${m.name}'} + mind. 1 named export?\n` +
    `verdict=PASS nur wenn alle vier true. Sonst FAIL + konkrete issues. Nur prüfen, nichts beheben.`,
    { label: `verify:${m.name}`, phase: 'Verify', schema: VERIFY_SCHEMA }
  )
)

const flat = results.filter(Boolean)
const pass = flat.filter((r) => r?.verdict === 'PASS')
const fail = flat.filter((r) => r?.verdict !== 'PASS')

log(`Molecules fertig: ${pass.length}/${MOLECULES.length} PASS`)

return {
  total: MOLECULES.length,
  passed: pass.map((r) => r.component),
  failed: fail.map((r) => ({ component: r?.component, issues: r?.issues })),
  details: flat,
}
