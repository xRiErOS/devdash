# Screen-Contract: AppShell (globaler App-Frame)

**Route:** kein Route-Screen — globaler Frame um alle Projekt-/Tool-Screens · **Ebene:** P0 Fundament (`src/screens/_shell/`) · **Wiederverwendung:** L2 (compose + wire) + Net-New (Breadcrumb, Rail-Toggle) + Reaktivierung (ShortcutsHelp, DDLogo).

> Quelle: BRIEFING (`mockups/AppShell.briefing.md`) + GAP-LIST (`mockups/AppShell.gap.md`) + po-review (`DD-wt-backlog-pane/…/po-review.json`, AppShell-Stories) + PO-Decisions 2026-06-24. Greenfield-Herkunft (D12-G): aus Mockup+Gap, nicht Legacy-Extraktion. Mockup-Doku: `mockups/AppShell.mdx` (Aktueller Stand).

## Zweck
3-Zonen-Rahmen (Top-Leiste + Icon-Rail + Content-Outlet) um jeden produktiven App-Screen. Trägt globale Navigation (Rail), Projekt-/Entity-Schnellwechsel, globale Suche, Shortcuts-Hilfe, Theme. Organismen bleiben präsentational; Orchestrierung im Container (`useShell`-Hook, R6).

## Daten-Scope
- **Rail** = Route-Contract aus `src/screens/_shell/navItems.js` (`RAIL_ITEMS`, EINE Quelle). 4 Quick-Access-Items: home/roadmap/backlog/memories (PO 2026-06-24). milestones/sprints/issues/settings sind Routen, **keine** Rail-Items.
- **Suche** = globale Suche, **2 Stränge:** Kontext=Projekt → nur dieses Projekt (default); auf `/home`/ProjectLanding → alle **aktiven** Projekte.
- **Theme** = `useTheme` (localStorage `devd-theme`, `data-theme` am `<html>`). **Shortcuts** = statische Map (`useKeyboardShortcuts`). **QuickSwitcher** = bereits gefilterte Projekt-Liste (Prop).

## Vorhandene Bausteine (stabil — schon da)
| Baustein | Story-Status | Rolle hier |
|---|---|---|
| AppShell (Organism) | stable | 3-Zonen-Frame (`app-shell.root`) |
| AppShellTopbar | review* | Top-Leiste (Controls) — Wiring-Props ergänzen |
| AppShellRail | review* | Icon-Rail — Items aus navItems, 2 States, Toggle integriert |
| ProjectQuickSwitcher | stable | QuickSwitcher-Panel |
| SearchField | review* | Such-Eingabe (Ghost/transparent) |
| NavItem · IconButton · PageTitle | stable | Rail-/Topbar-Primitive |

`*` = Rework dieser Session (stable→review; PO setzt stable zurück, DD-186).

**Net-New (erst stabile Story, dann komponieren):**
- **Breadcrumb** (Molecule) — aus Topbar extrahiert (Draft `mockups/_components/Breadcrumb.jsx` → `src/components/ui/molecules/`, `/dd-build-story`).
- **Rail-Toggle** — als Button in `AppShellRail` integriert (unten-rechts), `collapsed`/`onToggleCollapsed`-Props.
- **`useShell`-Hook** — hebt Topbar-/Rail-State (Switcher/Shortcuts/Search/Theme/Collapse), Container-Concern.

**Reaktivierung nötig (archive → `/dd-build-story`, + Prüfung):** `ShortcutsHelp` (Shortcuts-Modal) · `DDLogo` (QuickSwitcher-Trigger).

## API
Exakte Pfade + Zod-Refs beim Bau aus `server/api.js` + `contracts/*.contracts.js` verifizieren — hier Struktur.

| Zweck | Method + Endpoint (zu verifizieren) | Strang |
|---|---|---|
| Suche im Projekt | `GET /api/search?project=:slug&q=…` | a) Kontext=Projekt |
| Suche alle aktiven | `GET /api/search?scope=all-active&q=…` | b) /home/Landing |

Theme/Shortcuts/Rail-Nav = client-seitig (kein Backend). QuickSwitcher-Projektliste aus vorhandenem Projects-Load.

## States (kanonisch)
| State | Darstellung |
|---|---|
| rail-collapsed | Draft1 icon-only (schmal) |
| rail-expanded | Draft3 marker-Rail (Kanon) |
| search-empty / -results / -loading | controlled Input; Ergebnis-Overlay (Bau) |
| quick-switcher open/closed | Popover unter Topbar |
| shortcuts open/closed | Modal |
| theme light/dark | `data-theme` |

## Actions
| id | Trigger | Verhalten | Toast |
|---|---|---|---|
| `rail-nav` | Rail-Item-Klick | `NavLink` → Projekt-Route, aktiv via `aria-current` | — |
| `rail-toggle` | Toggle-Button (Rail unten-rechts) | collapsed↔expanded (Draft1↔Draft3) | — |
| `quick-switcher` | DevDash-Logo (Taste `q`) | öffnet ProjectQuickSwitcher | — |
| `search` | SearchField (Taste `f`) | controlled; Submit → 2-Strang-Suche | error (Such-Fehler) |
| `shortcuts` | `?`-Button (Taste `?`) | öffnet ShortcutsHelp-Modal | — |
| `theme-toggle` | Sonne/Mond-Button | `useTheme` toggle | — |

## Overlays
ProjectQuickSwitcher (Popover) · ShortcutsHelp (Modal).

## data-ui-Anker (SOLL — leben in C4, hier gespiegelt)
`app-shell.root` · `app-shell.topbar` · `app-shell.topbar.quick-switcher` · `app-shell.topbar.breadcrumb` · `app-shell.topbar.search` · `app-shell.topbar.shortcuts` · `app-shell.topbar.theme-toggle` · `app-shell.rail` · `app-shell.rail.item.{home,roadmap,backlog,memories}` · `app-shell.rail.settings` · `app-shell.rail.toggle` · `app-shell.content` (Platzhalter).
Jeder Anker trägt Intent + Verhaltens-Test (TDD/play) — Gate prüft Präsenz, Test prüft Korrektheit (R2/D11).

## Feature-Parität / bewusste Entscheidungen
- [x] Rail-Nav route-gebunden, 4 Quick-Access-Items (EINE Quelle navItems)
- [x] Rail 2-States + Toggle (in der Rail)
- [x] QuickSwitcher via DevDash-Logo · Breadcrumb als Komponente
- [x] Suche 2-Strang (Projekt/all-active), Ghost-Stil
- [x] Shortcuts-Modal · Theme-Toggle (echte data-ui)
- [x] `app-shell.content` Outlet markiert (AppShell-Organism rendert `data-ui="app-shell.content"`; Such-Results-Surface bleibt OUT-OF-SCOPE bis greenfield Such-Screen — `useShell.submitSearch` berechnet nur den Scope)
- [x] Settings-Item-Dopplung versöhnt: gepinnte Rail-Zeile → global `/settings`; navItems `settings`=ProjectSettings bleibt Route (kein Rail-Item)

## Out-of-scope
Mobile-Shell (Bottom-Tab, FAB-Radial, Command-Palette ⌘K, Safe-Area — eigene SOLL DD-633/634/635) · produktiver greenfield Such-Ergebnis-Screen (TODO GF-2 Such-Surface; die Insel-Story zeigt nur eine Navigations-Demo-Trefferliste). EntityDetail-in-AppShell ist NICHT mehr out-of-scope: nach dem Mockup-Abbau (PO 2026-06-25) lebt die Teststory als Insel-Screen `08.60 Issues/IssueDetails` + als Such→IssueDetails-play-Demo in `08.10 Shell/AppShell` (Behavioral-Level-2).

## C4-Aktivierung (D13-G greenfield-inverse)
Dieser Contract ist **SEED für die C4-YAML** (`architecture.components.appshell.yaml`, Schritt 5): GF-2-Entities frisch ableiten (`app.web.appshell.topbar/.rail/.quick-switcher/.search/.shortcuts/.theme-toggle`) mit `app-shell.topbar.*`/`app-shell.rail.*`-Ankern, `realization: planned` (vor Code) → `wired` beim Bau. Legacy-Anker `app-shell.page-header.*`/`app-shell.sidebar.*` supersede-in-place (retire/`delta_code`). `validate_architecture_yaml` errors:0. Realization von Legacy (`src/views/`-Shell) auf `src/components/ui/organisms/AppShell*` + `src/screens/_shell/` umbiegen.
