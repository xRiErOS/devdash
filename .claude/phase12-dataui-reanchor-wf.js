export const meta = {
  name: 'phase12-dataui-reanchor',
  description: 'data-ui Re-Anchor über alle 48 Phase-1/2-Komponenten (Atoms+Molecules): gepunktetes Schema <bereich>.<sub>.<element> (Dev-Wiki 40.01), Sub-Anker auf jeder adressierbaren Region der Composites, Domänen-bereich entfernen. Nur data-ui ändern — kein Logik/Visual/Token-Change.',
  phases: [
    { title: 'Reanchor', detail: '48 Komponenten: data-ui auf gepunktetes granулäres Schema, Leaves no-op' },
  ],
}

const ROOT = '/Users/erik/Obsidian/tools/DeveloperDashboard'

const RULES = `
KONTEXT — DevDashboard React 19 + Tailwind v4. Du machst einen CHIRURGISCHEN data-ui-Re-Anchor.
Arbeite vom Repo-Root: ${ROOT}

ZIEL: data-ui-Anker auf das kanonische Schema bringen. Dev-Wiki 40.01:
  "Jedes ADRESSIERBARE Element trägt data-ui='<bereich>.<sub>.<element>', inkl. Label/Value-Spans."

REGELN (NUR data-ui anfassen):
1. bereich = Komponenten-Name in kebab-case (Modal -> 'modal', EmptyState -> 'empty-state', MetaPill -> 'meta-pill', CardHead -> 'card-head'). KEINE Domänen-Begriffe als bereich (NICHT 'issue-detail.*', NICHT 'sprint.*', NICHT 'milestone.*' als Domäne — der Komponentenname ist der bereich, auch wenn er 'milestone-pill' heißt).
2. SEPARATOR zwischen bereich und Sub-Teilen ist der PUNKT '.', NICHT Hyphen. Sub-Teil-Namen dürfen selbst kebab sein:  'modal.backdrop', 'modal.hover-label', 'ui-debug.indicator', 'shortcuts-help.body'. FALSCH: 'modal-backdrop', 'ui-debug-indicator', 'attachment-gallery' (-> 'attachment-dropzone.gallery').
3. Wurzel-Element = '<bereich>' (bloß der bereich, ok). JEDE adressierbare semantische Sub-Region bekommt '<bereich>.<part>':
   - Container-Slots: header, body, footer, divider/separator, toolbar, panel, backdrop, dialog, trigger, menu, list, gallery, preview
   - Leaves: title, label, value, icon, action, remove, close, count, badge, option, item, input, search, hint, error
   - Bei wiederholten Items: '<bereich>.item.\${index}' o. '<bereich>.option.\${value}' (Template-Literal, bestehende dynamische Keys behalten/anpassen).
4. Override-Props (z.B. Modal dialogDataUi/backdropDataUi): die DEFAULT-Strings auf das Punkt-Schema setzen ('modal.dialog', 'modal.backdrop'). Prop-Mechanik unverändert.
5. Sub-Komponenten, die aus ../atoms/ importiert werden (z.B. EmptyState rendert ../atoms/Button), bekommen KEIN data-ui aufgezwungen — das Atom trägt seinen eigenen bereich. Du verankerst nur die Elemente, die in DIESER Datei als DOM ausgegeben werden.

LEAF-NO-OP: Hat die Komponente nur EIN Wurzel-DOM-Element ohne weitere adressierbare Sub-Region (reine Atoms: Button, Pill, Input, Textarea, IconButton, TypeIcon, OptIcon, TabIcon, Ico, Stack, Cluster, Grid, Placeholders) und ist der bestehende Wert bereits ein gültiger bereich-Token (kein Hyphen-gejointer bereich.part, keine Domäne) -> NICHTS ändern, no-op melden. Layout-Primitive mit side/main (Sidebar) dürfen 'sidebar.side'/'sidebar.main' bekommen, müssen aber nicht.

HARTE INVARIANTEN (nicht verletzen):
- KEINE Änderung an Klassen, Styles, Logik, Props-Verhalten, Imports. NUR data-ui-String-Werte + ggf. NEUE data-ui-Attribute an bestehenden Elementen.
- 0 neue inline-style, 0 neue Raw-Hex. eslint --max-warnings=0 muss grün bleiben.
- Verlustfrei: das visuelle/funktionale Verhalten ist identisch.
`

const SCHEMA = {
  type: 'object',
  required: ['component', 'changed', 'anchorsAfter', 'summary'],
  properties: {
    component: { type: 'string' },
    changed: { type: 'boolean' },
    anchorsBefore: { type: 'number' },
    anchorsAfter: { type: 'number' },
    anchorSlugs: { type: 'array', items: { type: 'string' } },
    eslintPass: { type: 'boolean' },
    summary: { type: 'string' },
  },
}

const ATOMS = ['Button','Card','CardHead','Cluster','DebugOverlay','FeedbackPin','Grid','Ico','IconButton','Input','IssuePill','MetaBlock','MetaRow','MilestonePill','Modal','OptIcon','Pill','PopoverPanel','SessionsSlotPlaceholder','Sidebar','SprintPill','Stack','StatusBadge','StickyActionBar','TabButton','TabIcon','TerminalSlotPlaceholder','Textarea','Tooltip','TypeIcon','typeIcons']
const MOLS = ['AttachmentDropzone','Breadcrumb','DroppableColumn','EmptyState','FilterPopover','InlineEdit','LinkRow','MarkdownField','MetaCard','MetaPill','PreviewOverlay','PreviewToolbar','SegmentedControl','Select','ShortcutsHelp','Tabs','TagMultiSelect']

const ALL = [
  ...ATOMS.map((n) => ({ name: n, dir: 'atoms' })),
  ...MOLS.map((n) => ({ name: n, dir: 'molecules' })),
]

phase('Reanchor')

const results = await parallel(
  ALL.map((c) => () => {
    const path = `src/components/ui/${c.dir}/${c.name}.jsx`
    return agent(
      `${RULES}\n\nKOMPONENTE: ${path} (bereich = kebab von "${c.name}").\n\n` +
      `Schritte: (1) Datei lesen. (2) Alle DOM-Elemente identifizieren, die adressierbar sind (Slots + Leaves laut Regel 3). ` +
      `(3) data-ui-Werte auf das Punkt-Schema bringen (Regel 1-4) und fehlende Sub-Anker an bestehende Elemente ergänzen — via Edit, NUR data-ui anfassen. ` +
      `(4) Wenn Leaf-No-Op: nichts ändern. (5) Selbst-Check: \`grep -c 'data-ui=' ${path}\` (after) und \`npx eslint ${path} --max-warnings=0\` (exit 0). ` +
      `Verifiziere zusätzlich: \`git diff --stat ${path}\` zeigt NUR data-ui-Zeilen (keine Klassen/Style/Logik-Änderung) — falls dein Diff mehr berührt, ZURÜCK und nur data-ui ändern. ` +
      `Gib changed (bool), anchorsBefore/After, anchorSlugs (die finalen data-ui-Werte), eslintPass zurück.`,
      { label: `reanchor:${c.name}`, phase: 'Reanchor', schema: SCHEMA }
    )
  })
)

const flat = results.filter(Boolean)
const changed = flat.filter((r) => r?.changed)
const noop = flat.filter((r) => !r?.changed)
const eslintFail = flat.filter((r) => r?.eslintPass === false)

log(`Re-Anchor fertig: ${changed.length} geändert, ${noop.length} no-op, ${eslintFail.length} eslint-FAIL`)

return {
  total: ALL.length,
  changed: changed.map((r) => ({ c: r.component, n: r.anchorsAfter, slugs: r.anchorSlugs })),
  noop: noop.map((r) => r.component),
  eslintFail: eslintFail.map((r) => r.component),
}
