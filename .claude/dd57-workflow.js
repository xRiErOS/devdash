export const meta = {
  name: 'dd57-shell-archetypes',
  description: 'DD#57 P7: PageShell-Vertrag + 5 Archetyp-Organismen + Wireframes + Shell-Konsolidierung + Lint-Guard bauen (kein git, kein commit)',
  phases: [
    { title: 'Gate' },
    { title: 'Wireframes+GuardSpec' },
    { title: 'Organisms' },
    { title: 'Shell' },
    { title: 'Guard' },
  ],
}

const WT = '/Users/erik/Obsidian/tools/DeveloperDashboard/.claude/worktrees/dd57'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'ok', 'files', 'summary', 'verify', 'residual'],
  properties: {
    key: { type: 'string' },
    ok: { type: 'boolean', description: 'true wenn alle Akzeptanz-Checks grün und Dateien geschrieben' },
    files: { type: 'array', items: { type: 'string' }, description: 'relative Pfade ab Repo-Root, die du erstellt/geändert hast' },
    summary: { type: 'string', description: 'outcome_summary, 1-2 Sätze was erreicht wurde' },
    verify: { type: 'string', description: 'Tail des eslint- + vitest-Outputs als Beweis (oder bei HTML/Doc: Verifikationsnotiz)' },
    residual: { type: 'string', description: 'offene Punkte / Abweichungen vom Plan, sonst "keine"' },
  },
}

const PREAMBLE = `Du bist ein Build-Agent für Sprint DD#57 (DevDashboard, Frontend-Rework Phase 7).

ARBEITSVERZEICHNIS (zwingend, absolute Pfade): ${WT}
Der JIT-Plan liegt unter ${WT}/specs/2026-06-01-frontend-rework-07-shell-archetypes.md — LIES ihn zuerst (deinen Task-Abschnitt).

HARTE REGELN (Verstoß = Fehlschlag):
- KEIN git: niemals 'git add', 'git commit', 'git status', 'git switch', kein Stagen. Der Orchestrator committet.
- NICHT die Datei src/components/ui/index.js anfassen (Barrel macht der Orchestrator).
- KEIN 'npm test' (Vollsuite), KEIN 'npm install'. Nur gezielte 'npx vitest run <deinedatei>' + 'npx eslint <deinedateien> --max-warnings=0'.
- NEUE JSX: Catppuccin-Tokens AUSSCHLIESSLICH via Tailwind-Arbitrary-Value-Klassen, z.B. className="text-[var(--text)] bg-[var(--base)] border border-[var(--surface2)]". NIEMALS das style={{}}-Prop verwenden (verboten durch eslint forbid-dom-props + inline-style-budget cap=0 für neue Dateien) und NIEMALS Roh-Hex/Roh-px (Tailwind-Spacing p-1=4px etc.).
- Lucide-react Icons (import { X } from 'lucide-react'), kein Emoji.
- React 19, default-export, JSDoc am Component. Kein Redux.

TOKEN-VOKABULAR (aus src/index.css): --base --mantle --crust --surface0 --surface1 --surface2 --text --subtext0 --subtext1 --hint --accent-info --on-accent; Status: --peach(pending) --green(passed/done) --red(rejected) --blue(info/refined) --mauve(to_review).

SSR-TEST-MUSTER (env=node, React nicht DOM-renderbar → renderToStaticMarkup):
  import { test, expect } from 'vitest'
  import { html } from './render.js'                       // relativ ab tests/frontend-rework/
  import Comp from '../../src/components/ui/Comp.jsx'
  test('...', () => { const out = html(<Comp .../>); expect(out).toContain('...'); expect(out).not.toMatch(/#[0-9a-fA-F]{3,6}/) })
Referenzen zum Lesen: ${WT}/tests/frontend-rework/render.js, ${WT}/tests/frontend-rework/card.test.jsx, ${WT}/src/components/ui/MetaPill.jsx (zeigt className-[var(--..)]-Muster), ${WT}/src/components/ui/layout/PageShell.jsx, ${WT}/src/components/ui/Modal.jsx, ${WT}/src/components/ui/EmptyState.jsx.

SELBST-VERIFIKATION vor Rückgabe (Pflicht, Beweis in 'verify' einfügen):
  cd ${WT} && npx eslint <deine .jsx-Dateien> --max-warnings=0
  cd ${WT} && npx vitest run <dein Testfile> tests/frontend-rework/inline-style-budget.test.js tests/frontend-rework/no-raw-hex.test.js
Beide MÜSSEN grün sein. Wenn rot: fixen, bis grün. ok=true nur bei grün.

Gib NUR das geforderte JSON-Objekt zurück (StructuredOutput).`

// ---------- PHASE 1: GATE — DD-415 PageShell Slot-Vertrag ----------
phase('Gate')
const r415 = await agent(`${PREAMBLE}

=== DD-415: PageShell Slot-Vertrag (title/actions/sidebar/content) + SSR-Test ===
Datei ändern: src/components/ui/layout/PageShell.jsx
Test erweitern: tests/frontend-rework/page-shell.test.jsx (existiert bereits, NICHT ersetzen — ergänzen)

Aufgabe:
1. PageShell exponiert die benannten Slots als VERBINDLICHEN, JSDoc-dokumentierten Vertrag: title (string), actions (ReactNode, rechtsbündig im Header), sidebar (ReactNode, optionale linke/rechte Detail-Spalte), content (Hauptinhalt). RÜCKWÄRTSKOMPATIBEL: bestehende Nutzer übergeben children → behandle children als content-Fallback (content ?? children). Bestehende width-Prop (md|lg|full) + className bleiben.
2. Wenn sidebar gesetzt: zweispaltiges Layout (content + sidebar) via vorhandene Layout-Primitives (src/components/ui/layout/Sidebar.jsx oder Tailwind grid/flex-Klassen). Ohne sidebar: unverändert einspaltig.
3. WICHTIG inline-style: PageShell hat aktuell GENAU 1 style={{}} (Budget 1 in tests/frontend-rework/inline-style-budget.test.js). Erhöhe das NICHT. Neue Token-Farben via className-[var(--..)]. Wenn du das bestehende style={{color:'var(--text)'}} auf className umstellst (count→0), MUSST du in inline-style-budget.test.js den BUDGET-Eintrag 'src/components/ui/layout/PageShell.jsx' auf 0 setzen (Ratchet runter, der 'kein totes Budget'-Test verlangt exakte Gleichheit).
4. SSR-Test ergänzen: title, actions, sidebar, content werden alle gerendert; children-Fallback funktioniert; kein Roh-Hex. Bestehender Test muss grün bleiben.

Self-verify: npx eslint src/components/ui/layout/PageShell.jsx --max-warnings=0 ; npx vitest run tests/frontend-rework/page-shell.test.jsx tests/frontend-rework/inline-style-budget.test.js tests/frontend-rework/no-raw-hex.test.js`,
  { label: 'DD-415 PageShell', phase: 'Gate', schema: SCHEMA })

// ---------- PHASE 2: WIREFRAMES (HTML) + GUARD-SPEC ----------
phase('Wireframes+GuardSpec')
const WF = `${PREAMBLE.replace('NEUE JSX', 'HTML-Wireframes brauchen KEINE JSX/ESLint/vitest-Checks — stattdessen valides, im Browser renderbares HTML. NEUE JSX (falls doch)')}

WIREFRAME-REGELN: Eine eigenständige .html (inline <style> erlaubt, da KEIN React/kein src/ — die JSX-Verbote gelten NICHT für .html). Catppuccin-Tokens als CSS-Variablen in :root für html[data-theme="latte"] (default) UND html[data-theme="macchiato"] (dark) definieren (nutze realistische Catppuccin-Werte). Lucide-Icons via inline-SVG oder CDN <script>, kein Emoji. Jeder Slot sichtbar mit Label-Badge beschriftet (z.B. ein <span class="slot-label">filterBar</span>). Layout muss eingebettet in eine App-Shell wirken. Self-verify: Datei existiert, enthält beide data-theme-Blöcke + alle Slot-Labels (grep). 'verify' = grep-Beleg.`

const wireframes = [
  { key: 'DD-418', file: 'specs/32-Mockups/archetypes/listpage.html', spec: 'ListPage: Slots filterBar (oben, Filterleiste) + collection (Liste mit rowOrganism als EIN Row-Typ, ~5 Demo-Zeilen) + emptyState (separat unten als Zustand gezeigt) + bulkBar (Sticky-Bottom Auswahl-Aktionen). Slots beschriftet.' },
  { key: 'DD-419', file: 'specs/32-Mockups/archetypes/masterdetail.html', spec: 'MasterDetail: sidebar in ZWEI Varianten nebeneinander oder umschaltbar zeigen — Variante "Liste" (scrollbare Item-Liste) UND Variante "Meta" (Eigenschaften/Felder) + paneHeader + pane(Tabs) + actionBar. Beide Sidebar-Varianten sichtbar.' },
  { key: 'DD-420', file: 'specs/32-Mockups/archetypes/boardpage.html', spec: 'BoardPage: toolbar(Modus-Switch mit 3 Modi: Sprint-Board / Meilenstein-Swimlane / Timeline) + lanes + column + card + backfill. Drilldown Meilenstein⊃Sprint⊃Issue angedeutet. Alle 3 Modi skizziert (z.B. drei Sektionen).' },
  { key: 'DD-421', file: 'specs/32-Mockups/archetypes/formpage.html', spec: 'FormPage in 3 Ausprägungen: Classic / SettingsPage / Modal — alle drei zeigen, mit sections + actionBar an konsistenter Kante (Modal: Footer-ActionBar). Inputs 16px.' },
  { key: 'DD-422', file: 'specs/32-Mockups/archetypes/dashboardpage.html', spec: 'DashboardPage: grid (responsives auto-fit) + summaryCard (mehrere KPI-Karten) + chartCard (Platzhalter-Chart) + optionale tabs-Variante. EIN Card-Look.' },
]

const guardSpecAgent = () => agent(`${PREAMBLE}

=== DD-428: Archetyp-Lint-Guard SPEZIFIZIEREN (nur Doku, kein Code) ===
Datei ergänzen: specs/2026-06-01-frontend-rework-06-enforcement.md (bestehende Enforcement-Spec — hänge einen neuen Abschnitt "## Archetyp-Guard (DD-428/429, P7)" an, NICHT ersetzen).
Aufgabe: Präzise spezifizieren, OHNE zu implementieren:
- Treffer-Pattern: View-Dateien (src/views/**/*.jsx) dürfen am View-Root KEINE Top-Level-Layout-Primitives haben (className mit flex/grid am Wurzel-Element, p-*-Padding am Root, oder style am Root) AUSSERHALB eines Archetyp-Wrappers.
- Erlaubte Archetyp-Wrapper: PageShell, ListPage, MasterDetail, BoardPage, FormPage, DashboardPage (aus src/components/ui/).
- False-Positive-Allowlist: Shell-Varianten (AppShell.jsx, Layout.jsx, ProjectScope.jsx, CaptureView.jsx — Theme-Schalter + Capture-Host-PWA, siehe DD-417) ausgenommen.
- Mechanismus: ESLint flat-config-Regel (welche Regel/Selector: z.B. no-restricted-syntax mit JSX-Selector ODER react/forbid-dom-props-Erweiterung) + Einhängen via lint-staged staged-only --max-warnings=0; CI advisory.
Das ist die Vorlage, die DD-429 implementiert. KEINE eslint.config.js-Änderung hier. 'verify' = grep des neuen Abschnitts.`,
  { label: 'DD-428 GuardSpec', phase: 'Wireframes+GuardSpec', model: 'sonnet', schema: SCHEMA })

const phase2 = await parallel([
  ...wireframes.map(w => () => agent(`${WF}

=== ${w.key}: HTML-Wireframe ===
Datei erstellen: ${w.file}
${w.spec}
Lies vorher den Plan-Abschnitt Task 2. Self-verify per grep (beide data-theme-Blöcke + Slot-Labels vorhanden).`,
    { label: `${w.key} wireframe`, phase: 'Wireframes+GuardSpec', model: 'sonnet', schema: SCHEMA })),
  guardSpecAgent,
])

// ---------- PHASE 3: ORGANISMS ----------
phase('Organisms')
const organisms = [
  { key: 'DD-423', comp: 'ListPage', wf: 'listpage.html',
    spec: `Slots: filterBar, collection, rowOrganism, emptyState (PFLICHT), bulkBar.
- EIN Row-Typ erzwungen: prop rowOrganism ist EINE Komponente/Render-Funktion, auf jedes collection-Item angewandt.
- emptyState ist PFLICHT-Slot: wenn collection leer ist, rendere emptyState; der SSR-Test MUSS belegen, dass ein Fehlen von emptyState erkennbar ist (z.B. ListPage wirft/markiert, wenn emptyState fehlt UND collection leer). Implementiere: if collection leer && !emptyState → rendere sichtbaren Marker data-archetype-error oder wirf — und teste beide Fälle (mit emptyState: emptyState sichtbar; nicht-leer: Rows sichtbar).
- Rahmen via PageShell (title/actions/content). filterBar über collection, bulkBar als Sticky-Bottom.` },
  { key: 'DD-424', comp: 'MasterDetail', wf: 'masterdetail.html',
    spec: `Slots: sidebar (Variante 'list'|'meta' über prop sidebarVariant, beide über dieselbe Sidebar-Primitive src/components/ui/layout/Sidebar.jsx), paneHeader, pane (Tabs-Inhalt), actionBar.
- SSR-Test: beide sidebarVariant-Werte rendern; paneHeader/pane/actionBar vorhanden.` },
  { key: 'DD-425', comp: 'BoardPage', wf: 'boardpage.html',
    spec: `Generisches Gerüst (NICHT die 3-Modi-Voll-Konsolidierung — das ist DD-455/T01). Slots: toolbar, lanes, column, card, backfill.
- Horizontal scrollbar (Tailwind overflow-x-auto), DnD-fähig vorbereitet (Slots akzeptieren beliebige Kinder; KEINE dnd-kit-Verdrahtung nötig, nur generische Struktur).
- SSR-Test: alle Slots rendern.` },
  { key: 'DD-426', comp: 'FormPage', wf: 'formpage.html',
    spec: `Slots: sections, actionBar. prop variant: 'classic'|'settings'|'modal'.
- Eine Schablone, 3 Ausprägungen. ActionBar an konsistenter Kante. variant='modal' nutzt zentrales src/components/ui/Modal.jsx und zeigt Footer-ActionBar.
- SSR-Test: alle 3 Varianten rendern; actionBar in jeder vorhanden; modal-Variante nutzt Modal.` },
  { key: 'DD-427', comp: 'DashboardPage', wf: 'dashboardpage.html',
    spec: `Slots: grid, summaryCard, chartCard, optional tabs. Eigener Typ (nicht in FormPage/ListPage falten).
- auto-fit-Grid über src/components/ui/layout/Grid.jsx (oder Tailwind grid-cols-[repeat(auto-fit,minmax(...,1fr))]). EIN Card-Look (nutze ui/Card.jsx).
- SSR-Test: grid + summaryCard + chartCard rendern.` },
]
const phase3 = await parallel(organisms.map(o => () => agent(`${PREAMBLE}

=== ${o.key}: Archetyp-Organismus ${o.comp} bauen ===
Datei erstellen: src/components/ui/${o.comp}.jsx
Test erstellen: tests/frontend-rework/archetype-${o.comp.toLowerCase()}.test.js
Wireframe-Referenz (lesen, NICHT 1:1 kopieren — Patterns extrahieren): ${WT}/specs/32-Mockups/archetypes/${o.wf}
Setzt voraus (existiert jetzt): PageShell-Slot-Vertrag (src/components/ui/layout/PageShell.jsx).

${o.spec}

Allgemein: default-export, JSDoc mit allen Slot-Props. Tokens NUR via className-[var(--..)] (ZERO style={{}} → Datei ist NICHT im inline-style-Budget, cap=0). Optionales data-ui-Prop durchreichen (nicht hardcoden).
Self-verify: npx eslint src/components/ui/${o.comp}.jsx tests/frontend-rework/archetype-${o.comp.toLowerCase()}.test.js --max-warnings=0 ; npx vitest run tests/frontend-rework/archetype-${o.comp.toLowerCase()}.test.js tests/frontend-rework/inline-style-budget.test.js tests/frontend-rework/no-raw-hex.test.js`,
  { label: `${o.key} ${o.comp}`, phase: 'Organisms', schema: SCHEMA })))

// ---------- PHASE 4: SHELL (DD-416 routing + DD-417 doc) ----------
phase('Shell')
const phase4 = await parallel([
  () => agent(`${PREAMBLE}

=== DD-416: Layout-Routes/Outlet konsolidieren (Master-Detail über Shell) ===
Dateien ändern: src/views/AppShell.jsx und ggf. src/views/ProjectScope.jsx
KRITISCH — REINE KOMPOSITION, KEINE VERHALTENSÄNDERUNG: Routing-Semantik (alle Route-Pfade, Deep-Links, Capture /catch/<slug> DD-269, Loader, Redirects) MUSS identisch bleiben. Ändere KEINE Pfad-Strings, keine Route-Reihenfolge-Semantik.
Aufgabe: react-router Outlet/Layout-Routes so umbauen, dass der Master-Detail-Rahmen EINHEITLICH über die Shell-Slots (PageShell-Vertrag) läuft statt pro View nachgebaut — wo es OHNE Verhaltensänderung möglich ist. Wenn eine sichere Konsolidierung nicht ohne Risiko geht, mache den konservativen Schritt (AppShell nutzt PageShell als kanonischen Rahmen) und dokumentiere den Rest in residual.
Beweis-Pflicht: VOR und NACH der Änderung die Liste aller <Route ...path=...> per grep extrahieren und in 'verify' belegen, dass sie IDENTISCH ist. inline-style-count nicht erhöhen (AppShell Budget 1, ProjectScope Budget 2).
Self-verify: npx eslint src/views/AppShell.jsx src/views/ProjectScope.jsx --max-warnings=0 ; npx vitest run tests/frontend-rework/inline-style-budget.test.js ; grep-Diff der Route-Pfade (muss leer sein).`,
    { label: 'DD-416 Shell-Routes', phase: 'Shell', schema: SCHEMA }),
  () => agent(`${PREAMBLE.replace('NEUE JSX', 'Reine Doku (DESIGN.md) — JSX-Verbote gelten nicht. NEUE JSX (falls doch)')}

=== DD-417: Theme-Schalter + Capture-Host als bewusste Shell-Varianten dokumentieren (nur Doku) ===
Datei ändern: DESIGN.md (im Repo-Root ${WT}/DESIGN.md) — neuen Abschnitt anhängen.
Aufgabe: Theme-Schalter (Latte default / Macchiato dark) UND Capture-Host-PWA-Shell (issues.familie-riedel.org, DD-375) als BEWUSST SANKTIONIERTE Shell-Varianten dokumentieren, sodass der Archetyp-Guard (DD-428/429) sie nicht fälschlich als Drift flaggt. Nenne konkret die Dateien der Allowlist (AppShell.jsx, Layout.jsx, ProjectScope.jsx, CaptureView.jsx) und die Begründung (Theme = html[data-theme], Capture-Host = eigene minimale PWA-Shell ohne Nav). Kurz, präzise, Markdown ohne Trennlinien.
Self-verify: grep des neuen Abschnitts in DESIGN.md. 'verify' = grep-Beleg.`,
    { label: 'DD-417 Shell-Variants-Doc', phase: 'Shell', model: 'sonnet', schema: SCHEMA }),
])

// ---------- PHASE 5: GUARD IMPL (DD-429) ----------
phase('Guard')
const r429 = await agent(`${PREAMBLE}

=== DD-429: Archetyp-Lint-Guard an P6-Enforcement hängen (Implementierung) ===
Lies zuerst die Spez: ${WT}/specs/2026-06-01-frontend-rework-06-enforcement.md (Abschnitt "Archetyp-Guard", von DD-428 ergänzt) UND DESIGN.md Shell-Varianten-Allowlist (DD-417).
Dateien ändern: eslint.config.js (Regel hinzufügen) ; ggf. package.json (lint-staged bleibt — keine Pflichtänderung) ; .github/workflows/ci.yml (advisory, falls Lint-Step existiert: unverändert lassen wenn schon advisory).
Aufgabe: Die in DD-428 spezifizierte Regel in eslint.config.js implementieren — View-Dateien (src/views/**/*.jsx) dürfen keine Top-Level-Layout-Primitives außerhalb eines Archetyp-Wrappers; Shell-Varianten (AppShell/Layout/ProjectScope/CaptureView) auf der Allowlist (eigener config-Block mit gelockerter Regel ODER ignores). Nutze no-restricted-syntax mit passendem JSXElement-Selector ODER eine pragmatische Heuristik — Regel als 'warn' (konsistent mit forbid-dom-props; lint-staged --max-warnings=0 macht sie auf gestagten Views hart).
WICHTIG: Die Regel darf den BESTAND nicht build-brechend machen — 'npm run lint' bleibt Exit-0-Burn-down (warn). Verifiziere, dass 'npx eslint src --max-warnings=9999' weiterhin durchläuft (kein parser-Crash) und dass ein ABSICHTLICHER Verstoß (lege testweise eine Dummy-View mit Top-Level flex an, prüfe, dann LÖSCHE sie wieder) als Warnung erkannt wird.
'verify' = eslint-Lauf-Beleg (Bestand läuft) + Beleg, dass der absichtliche Verstoß geflaggt wurde (und Dummy wieder gelöscht).
Self-verify: cd ${WT} && npx eslint src --max-warnings=9999 (muss Exit 0 / nur Warnungen sein, kein Crash).`,
  { label: 'DD-429 Guard-Impl', phase: 'Guard', schema: SCHEMA })

// ---------- COLLECT ----------
const all = [r415, ...phase2, ...phase3, ...phase4, r429].filter(Boolean)
log(`DD#57 build done: ${all.length} Agenten zurück, ${all.filter(a => a.ok).length} ok`)
return all
