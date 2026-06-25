export const meta = {
  name: 'phase1-atoms-scaleup',
  description: 'Storybook-Canonical Phase 1 Scale-up: verbleibende 27 Tier=Atom-Komponenten token-clean nach src/components/ui/atoms/ (8 Inline-Extraktionen + 19 Harvests), je mit Story; adversarialer Verify pro Atom (eslint/inline/hex/story).',
  phases: [
    { title: 'Build', detail: '27 Atoms: Komponente + Story, 0 inline-style (4 mit dynamischem maxInline=1)' },
    { title: 'Verify', detail: 'pro Atom: eslint max-warnings=0, inline<=maxInline, rawHex==0, Story-title korrekt' },
  ],
}

const ROOT = '/Users/erik/Obsidian/tools/DeveloperDashboard'

const CONVENTIONS = `
KONTEXT — DevDashboard React 19 + Tailwind v4 + Catppuccin (Latte hell / Macchiato dunkel).
Arbeite vom Repo-Root: ${ROOT}

KANONISCHE LIBRARY — Stufe-2 Greenfield+Harvest, ADDITIV:
- Neue Datei schreiben nach src/components/ui/atoms/<Name>.jsx (Tier-Namespace existiert bereits).
- Story daneben: src/components/ui/atoms/<Name>.stories.jsx, Story-title = 'Atoms/<Name>'.
- ALTE Quell-Datei NICHT anfassen/löschen, KEINE Screen-Imports umbiegen, Barrel index.js NICHT ändern. Rein additiv. Screens migrieren erst in Phase 5.

KANONISCHES MUSTER (wie atoms/Button.jsx, atoms/Pill.jsx — lies eine davon als Vorlage falls unsicher):
- default export function <Name>(props) { ... }, JSDoc-Proptypes-Kommentar darüber.
- Variant/Color/Size als STATISCHE Klassen-Maps (const VARIANT = {...}), KEINE String-Interpolation im Token (Tailwind-JIT muss die Klassen literal sehen).
- Props-driven: kein Store, kein Fetch, KEINE Domänen-Begriffe (Sprint/Issue/Milestone/Todo) in der Logik. Reine Display-Props.
- Wurzel-Element: data-ui="<name-kebab>" (DD#61).

TOKEN-CLEAN (style={{}} -> Tailwind v4 arbitrary):
- background:'var(--accent-primary)'  ->  className bg-[var(--accent-primary)]
- color:'var(--on-accent)'            ->  text-[var(--on-accent)]
- background:'var(--surface1)'        ->  bg-[var(--surface1)]
- color-mix:  bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]  (Spaces -> Unterstrich!)
- feste px-Größen via Size-Map, z.B. {sm:'w-7 h-7', md:'w-9 h-9', lg:'w-11 h-11'}
- disabled/cursor via Klassen: 'disabled:opacity-50 disabled:cursor-not-allowed'
- Radius: rounded / rounded-lg / rounded-md (liest var(--radius-*)). Kein bare style.
Verfügbare Tokens: --accent-{primary,success,danger,warning,info}, --surface{0,1,2}, --text, --subtext{0,1}, --on-accent, --radius-{sm,md,lg,xl}. Beide Themes durch Tokens automatisch abgedeckt.

DYNAMISCHE-STYLE-AUSNAHME (NUR wenn maxInline>0 für dieses Atom):
- Ein Wert ist ECHT runtime-dynamisch (z.B. prozentuale Klick-Position, computed gridTemplateColumns, getBoundingClientRect-Position). Dieser EINE style={{...}} darf bleiben.
- Darüber MUSS stehen: \`// eslint-disable-next-line react/forbid-dom-props\` (exakte Rule-ID via eslint verifizieren) + 1 Zeile Begründung warum runtime-dynamisch.
- ALLE statischen Styles trotzdem -> Tailwind. Nur der dynamische bleibt.

HARVEST = verlustfrei: gleiche öffentliche API + gleiches visuelles/funktionales Verhalten wie die Quelle. Nichts weglassen, nichts umbenennen.
EXTRACT = die benannte Inline-Sub-Komponente aus dem Multi-Export-File herausziehen in eigene Datei, verlustfrei, Domänen-Bezug entfernen (props-driven machen).

STORY-KONVENTION: default export { title:'Atoms/<Name>', component }, named exports Default + relevante Varianten/States. KEIN inline-style, KEIN Roh-Hex in der Story. Render-Beispiele nutzen Tailwind-Klassen + (falls Icons) lucide-react.
`

const BUILD_SCHEMA = {
  type: 'object',
  required: ['component', 'componentPath', 'storyPath', 'inlineStyleCount', 'rawHexCount', 'summary'],
  properties: {
    component: { type: 'string' },
    componentPath: { type: 'string' },
    storyPath: { type: 'string' },
    inlineStyleCount: { type: 'number' },
    rawHexCount: { type: 'number' },
    variantsCovered: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['component', 'eslintPass', 'inlineWithinBudget', 'rawHexZero', 'storyExists', 'verdict'],
  properties: {
    component: { type: 'string' },
    eslintPass: { type: 'boolean' },
    inlineWithinBudget: { type: 'boolean' },
    inlineStyleCount: { type: 'number' },
    rawHexZero: { type: 'boolean' },
    storyExists: { type: 'boolean' },
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

// maxInline>0 nur bei echt runtime-dynamischen Werten (Inventar: "akzeptiert/behalten").
const ATOMS = [
  // --- Inline-Extraktionen (multi-export Quelle) ---
  { name: 'TypeIcon', mode: 'extract', source: 'src/components/projectHome/TodoLinksList.jsx', exportName: 'TypeIcon', maxInline: 0,
    note: `HÖCHSTE PRIO (reuse=6). Lucide-Dispatch nach Link-Typ. Props: { type, size?, className? }. Mapping type->Lucide-Icon als statische Map. KEIN Bezug zu Todo/Issue-State. HINWEIS: bleibt GETRENNT von typeIcons (das ist Issue-Typ-Mapping, anderes Atom) — NICHT mergen. Story: alle Typen als Grid.` },
  { name: 'OptIcon', mode: 'extract', source: 'src/components/projectHome/AddLinkPicker.jsx', exportName: 'OptIcon', maxInline: 0,
    note: `Farbiges Lucide-Dispatch (Option-Icon). Props props-driven. Story: alle Optionen.` },
  { name: 'TabIcon', mode: 'extract', source: 'src/components/projectHome/ProjectHomeTabs.jsx', exportName: 'TabIcon', maxInline: 0,
    note: `Reines Lucide-Icon-Dispatch nach Tab-Key. Props: { name/key, size?, className? }. Domänen-Begriffe (todo/backlog/sstd) sind hier nur Icon-Keys — als generische String-Keys behandeln. Story: alle Keys.` },
  { name: 'TabButton', mode: 'extract', source: 'src/components/projectHome/ProjectHomeTabs.jsx', exportName: 'TabButton', maxInline: 0,
    note: `Eine Tab-Schaltfläche. Props: { active, count?, icon?, children/label, onClick }. active-Styling + count-Badge. Kein Tab-Routing-State (props-driven). Story: Active/Inactive/WithCount.` },
  { name: 'Ico', mode: 'extract', source: 'src/components/projectHome/SettingsSidebar.jsx', exportName: 'Ico', maxInline: 0,
    note: `Icon-Wrapper/Slot ohne State. Props: { icon, size?, className? }. Story: Default + Sizes.` },
  { name: 'CardHead', mode: 'extract', source: 'src/components/projectHome/SettingsSidebar.jsx', exportName: 'CardHead', maxInline: 0,
    note: `Card-Header: Icon + H3-Title. Props: { icon?, title/children, className? }. Story: Default, WithIcon.` },
  { name: 'MetaRow', mode: 'extract', source: 'src/components/projectHome/SettingsSidebar.jsx', exportName: 'MetaRow', maxInline: 0,
    note: `Label+Value-Zeile (zweispaltig). Props: { label, value/children, className? }. Story: Default + mehrere Rows.` },
  { name: 'IssuePill', mode: 'extract', source: 'src/components/projectHome/SortableTodoItem.jsx', exportName: 'IssuePill', maxInline: 0,
    note: `Farbige Issue-Key-Pille mit click. Props: { children/label, onClick?, className? } — Issue-Key kommt als String-Prop rein, KEIN Fetch/Nav-State im Atom (onClick callback durchreichen). blue/info-Color via Token. Story: Default, Clickable.` },

  // --- Harvest eigene Datei: Layout-Primitive ---
  { name: 'Card', mode: 'harvest', source: 'src/components/ui/Card.jsx', maxInline: 0,
    note: `Token-Mapping behalten; background/border -> Tailwind-arbitrary. Story: Default, mit Inhalt.` },
  { name: 'Cluster', mode: 'harvest', source: 'src/components/ui/layout/Cluster.jsx', maxInline: 0,
    note: `flex-wrap-Primitiv. gap/justify-Props behalten. Story: Default + gap/justify-Varianten.` },
  { name: 'Stack', mode: 'harvest', source: 'src/components/ui/layout/Stack.jsx', maxInline: 0,
    note: `flex-col-Primitiv. as-Prop + align-Map behalten. Story: Default + align-Varianten.` },
  { name: 'Grid', mode: 'harvest', source: 'src/components/ui/layout/Grid.jsx', maxInline: 1,
    note: `CSS-Grid-Primitiv. min-Prop-Pattern behalten. gridTemplateColumns ist runtime-dynamisch -> EIN style erlaubt (eslint-disable-Kommentar). Rest Tailwind. Story: Default + min-Varianten.` },
  { name: 'Sidebar', mode: 'harvest', source: 'src/components/ui/layout/Sidebar.jsx', maxInline: 1,
    note: `Flex-Primitiv. sideWidth-Prop + sideRight-Toggle behalten. sideWidth runtime-dynamisch -> EIN style erlaubt (eslint-disable). Story: Default, sideRight.` },
  { name: 'MetaBlock', mode: 'harvest', source: 'src/components/itemDetail/MetaBlock.jsx', maxInline: 0,
    note: `label/value-Slot-API behalten. 3× style -> Token-Klassen. Story: Default + mehrere Blocks.` },

  // --- Harvest eigene Datei: Badges/Pills/Display ---
  { name: 'MilestonePill', mode: 'harvest', source: 'src/components/MilestonePill.jsx', maxInline: 0,
    note: `Kompaktes Display-Badge für Milestone-Name (Name kommt als String-Prop, kein Fetch). Clean. Story: Default + lange/kurze Labels.` },
  { name: 'SprintPill', mode: 'harvest', source: 'src/components/ui/SprintPill.jsx', maxInline: 0,
    note: `span/a-Primitiv. Sprint-ID-Format + Link/span-Switch behalten (ID als String-Prop, href optional). 3× style abbauen -> Tailwind. Story: Default (span), AsLink.` },
  { name: 'StatusBadge', mode: 'harvest', source: 'src/components/StatusBadge.jsx', maxInline: 0,
    note: `Status->Catppuccin-Token-Mapping als statische Map (status-String -> Klassen). 1× style -> Klassen. data-ui="status-badge". Story: alle Status-Werte.` },
  { name: 'typeIcons', mode: 'harvest', source: 'src/components/ui/typeIcons.jsx', maxInline: 0,
    note: `SPEZIALFALL: reines Mapping-Objekt (kein default-Component-Export Pflicht — named exports TYPE_ICON_MAP + Farb-Map ok). 1× style (Farbe) -> Tailwind-Klasse oder Token. KEIN Merge mit TypeIcon. Story 'Atoms/typeIcons': rendert alle Map-Einträge als Icon-Grid.` },

  // --- Harvest eigene Datei: Overlays/Panels/Form ---
  { name: 'Modal', mode: 'harvest', source: 'src/components/ui/Modal.jsx', maxInline: 0,
    note: `Wrapper-Primitiv: Backdrop+Panel+Focus-Trap+ESC-Close+role=dialog behalten. Clean (0 style in Quelle). Story: Default offen mit Inhalt.` },
  { name: 'PopoverPanel', mode: 'harvest', source: 'src/components/ui/PopoverPanel.jsx', maxInline: 0,
    note: `Optik-Shell (div). 1× style -> Tailwind. Story: Default mit Inhalt.` },
  { name: 'StickyActionBar', mode: 'harvest', source: 'src/components/ui/StickyActionBar.jsx', maxInline: 0,
    note: `footer-Wrapper sticky + justify-end. 1× style -> Tailwind. Story: Default mit Buttons.` },
  { name: 'Textarea', mode: 'harvest', source: 'src/components/ui/Textarea.jsx', maxInline: 0,
    note: `textarea-Primitiv. auto-resize-hint behalten. font-size 16px gegen iOS-Zoom. 1× style -> Tailwind. Story: Default, Disabled, Placeholder.` },
  { name: 'Tooltip', mode: 'harvest', source: 'src/components/ui/Tooltip.jsx', maxInline: 1,
    note: `DOM-Portal-Primitiv. Portal+LayoutEffect-Positionierung behalten. Position ist runtime-computed (getBoundingClientRect) -> EIN style erlaubt (eslint-disable). Story: Default mit Trigger+Content.` },
  { name: 'DebugOverlay', mode: 'harvest', source: 'src/components/DebugOverlay.jsx', maxInline: 0,
    note: `Rein visueller Debug-Layer, kein State. Overlay-Positionierung behalten. 3× style -> CSS/Tailwind-Klassen. Story: Default.` },
  { name: 'FeedbackPin', mode: 'harvest', source: 'src/components/FeedbackPin.jsx', maxInline: 1,
    note: `Positionierter Marker. top/left sind prozentual aus Klick (runtime) -> EIN style (zusammengefasst {top,left}) erlaubt (eslint-disable). ALLE statischen styles -> Tailwind. Story: Default, mehrere Pins.` },

  // --- Harvest eigene Datei: Slot-Placeholders ---
  { name: 'SessionsSlotPlaceholder', mode: 'harvest', source: 'src/components/projectHome/slots/SessionsSlotPlaceholder.jsx', maxInline: 0,
    note: `Platzhalter-Div mit slot-* Klassen + data-ui. Clean. Story: Default.` },
  { name: 'TerminalSlotPlaceholder', mode: 'harvest', source: 'src/components/projectHome/slots/TerminalSlotPlaceholder.jsx', maxInline: 0,
    note: `Platzhalter-Div mit data-ui. Clean. Story: Default.` },
]

phase('Build')

const results = await pipeline(
  ATOMS,
  (atom) => agent(
    `${CONVENTIONS}\n\nAUFGABE — Atom "${atom.name}" (mode=${atom.mode}, maxInline=${atom.maxInline}):\n` +
    `QUELLE: ${atom.source}${atom.exportName ? ` — extrahiere die Inline-Komponente/Export "${atom.exportName}" daraus` : ''}\n` +
    `${atom.note}\n\n` +
    `Schritte: (1) Quell-Datei lesen (Read).${atom.mode === 'extract' ? ` Finde die Inline-Definition von "${atom.exportName}".` : ''} ` +
    `(2) atoms/${atom.name}.jsx schreiben (Write) — kanonisches Muster, data-ui, token-clean. ` +
    `(3) atoms/${atom.name}.stories.jsx schreiben (Write) — title 'Atoms/${atom.name}'. ` +
    `(4) Selbst messen: \`grep -c 'style={{' src/components/ui/atoms/${atom.name}.jsx\` (MUSS <= ${atom.maxInline}) und \`grep -cE '#[0-9a-fA-F]{3,8}' src/components/ui/atoms/${atom.name}.jsx\` (MUSS 0). Sonst nachbessern. ` +
    `${atom.maxInline > 0 ? `(4b) Falls ein dynamischer style bleibt: \`npx eslint src/components/ui/atoms/${atom.name}.jsx\` laufen, exakte Rule-ID des style-Warnings ablesen, eslint-disable-next-line mit DIESER Rule-ID + Begründung darüber setzen.` : ''} ` +
    `Gib componentPath/storyPath relativ zum Repo-Root + gemessene inlineStyleCount/rawHexCount zurück.`,
    { label: `build:${atom.name}`, phase: 'Build', schema: BUILD_SCHEMA }
  ),
  (build, atom) => agent(
    `${CONVENTIONS}\n\nADVERSARIALER VERIFY für Atom "${atom.name}" (maxInline=${atom.maxInline}). Repo-Root ${ROOT}.\n` +
    `Build meldete: ${build?.summary}\n- Komponente: ${build?.componentPath}\n- Story: ${build?.storyPath}\n\n` +
    `Führe AUS und urteile streng (Build-Self-Report NICHT vertrauen, selbst messen):\n` +
    `1. eslintPass: \`npx eslint ${build?.componentPath} ${build?.storyPath} --max-warnings=0\` -> exit 0?\n` +
    `2. inlineStyleCount: \`grep -c 'style={{' ${build?.componentPath}\` -> inlineWithinBudget = (count <= ${atom.maxInline})? Bei count>0 prüfen ob jeder verbleibende style ECHT runtime-dynamisch ist UND eslint-disable-Kommentar trägt; sonst FAIL.\n` +
    `3. rawHexZero: \`grep -cE '#[0-9a-fA-F]{3,8}' ${build?.componentPath}\` == 0?\n` +
    `4. storyExists: Story existiert, exportiert default {title:'Atoms/${atom.name}'} + mind. 1 named export?\n` +
    `verdict=PASS nur wenn eslintPass && inlineWithinBudget && rawHexZero && storyExists. Sonst FAIL + konkrete issues. Du behebst NICHTS, nur prüfen + berichten.`,
    { label: `verify:${atom.name}`, phase: 'Verify', schema: VERIFY_SCHEMA }
  )
)

const flat = results.filter(Boolean)
const pass = flat.filter((r) => r?.verdict === 'PASS')
const fail = flat.filter((r) => r?.verdict !== 'PASS')

log(`Scale-up fertig: ${pass.length}/${ATOMS.length} PASS`)

return {
  total: ATOMS.length,
  passed: pass.map((r) => r.component),
  failed: fail.map((r) => ({ component: r?.component, issues: r?.issues })),
  details: flat,
}
