## Spezifikation — ToolHome

**Scope:** ToolHome — globaler Einstiegspunkt, Projektauswahl-Screen
**Basis für:** Promote-Loop Phase: ToolHome Screen (`/projects`-Stub ablösen)
**Stand:** 2026-06-26

## 1. Zweck & Verwendung

ToolHome ist der globale Einstiegspunkt des Developer Dashboards. Ohne aktiven Projektkontext landet der Nutzer hier — direkt nach Aufruf der App (`/` → redirect → `/home`) oder über explizite Navigation. Die Seite zeigt alle verfügbaren Projekte als Cards und ermöglicht den Einstieg in ein Projekt per Klick.

**Typischer Flow:**
1. Nutzer öffnet DevDash → `/` redirect → `/home` (D05)
2. Sieht Projektliste als Grid mit Cards
3. Klickt auf Projekt → `projectStore` gesetzt + Navigate `/:slug/home`
4. NavigationRail wechselt in projekt-spezifischen Modus

**Abgrenzung:** ToolHome ist kein Project-Home (`/:slug/home`). Es ist der _globale_ Lobby-Screen ohne Projektkontext.

## 2. Komponentenbaum

```
ToolHomeScreen                   (src/ui/screens/ToolHomeScreen.jsx — presentational)
├── ToolHomeHeader
│   ├── PageTitle                ("Projekte")
│   └── [opt.] SearchInput       (client-seitiger Filter auf name/prefix)
├── ProjectGrid                  (CSS Grid, inline)
│   ├── ProjectCard ×N           (src/ui/organisms/base/ProjectCard.jsx)
│   │   ├── ProjectCard.Accent   (Farbbalken oben, color → Catppuccin-Token)
│   │   ├── ProjectCard.Header
│   │   │   ├── PrefixBadge      ("DD2")
│   │   │   └── ProjectName      ("DevD 2.0")
│   │   ├── ProjectCard.Description   (1–2 Zeilen, cond. wenn description vorhanden, D08)
│   │   ├── ProjectCard.Meta
│   │   │   ├── StatBadge Sprint (sprint_count)
│   │   │   ├── StatBadge Backlog (backlog_count)
│   │   │   └── [cond.] ActiveSprintChip (active_sprint?.name)
│   │   └── ProjectCard.Footer
│   │       └── Button "Öffnen"
│   └── AddProjectCard           (CTA-Karte, D07)
└── EmptyState                   (wenn projects.length === 0)

ToolHome                         (src/screens/ToolHome/ToolHome.jsx — connected)
└── wraps ToolHomeScreen (fetcht /api/projects, setzt projectStore, navigiert)
```

## 3. Layout

- Innerhalb `AppShellFrame` (NavigationRail + Topbar bleiben aktiv)
- **NavigationRail:** Globaler Modus — projekt-spezifische Items (home/roadmap/backlog/memories) **ausgeblendet** (D06); nur RAIL_FOOT_ITEMS (Settings) sichtbar
- **Topbar-Breadcrumb:** "DevDash" (kein Slug, kein View-Label)
- **Hauptinhalt:** volle Breite (`data-ui="app-shell.content"`)
- **Grid:** `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-4)`; max. 4 Spalten effektiv
- **Kein Side-Panel**
- **Header-Zeile:** 1 Zeile — Titel links, optionaler Search-Input rechts

## 4. Komponentenlogik

**ToolHomeScreen (presentational):**
- Props: `projects: Project[]`, `isLoading: boolean`, `error: string|null`, `onProjectSelect: (slug: string) => void`, `onCreateProject?: () => void`
- `isLoading=true` → Skeleton-Cards (3× Placeholder mit gleicher Dimension wie echte Card)
- `projects.length === 0` → EmptyState + CTA
- `error !== null` → Error-Banner (inline `role="alert"`, kein Toast)
- Archivierte Projekte: client-seitig per `project.archived === 0` filtern (D01)

**ProjectCard (presentational):**
- Props: `project: Project`, `onSelect: (slug: string) => void`
- Farbzuordnung: `project.color` → `var(--ctp-<color>)` (z.B. "mauve" → `var(--ctp-mauve)`)
- `project.description` → 1–2 Zeilen unter Name, `line-clamp-2`, nur wenn nicht leer (D08)
- Gesamte Card + "Öffnen"-Button → `onSelect(project.slug)`
- Feste min-height, kein Overflow-Scroll — lange Namen mit `text-overflow: ellipsis`

**ToolHome (connected):**
- `useEffect` bei Mount → `fetch('/api/projects')` (apiClient appended `?fields=full` auto)
- Setzt `projectStore.setActiveProjectId(id)` + `setActiveSlug(slug)` bei Selektion
- Navigiert via `useNavigate()` zu `/${slug}/home`
- Kein separater Fetch für `active_sprint` nötig — im full-Response enthalten (D02)

## 5. States

| State | Trigger | Darstellung |
|-------|---------|-------------|
| Loading | Fetch läuft (mount) | 3× Skeleton-Card, gleiche Dimension wie echte Card |
| Populated | Fetch OK, Projekte vorhanden | ProjectGrid mit N Cards |
| Empty | Fetch OK, keine Projekte | EmptyState + "Neues Projekt"-CTA |
| Error | Fetch fehlgeschlagen | Error-Banner (inline, `role="alert"`) |
| Creating | Klick "Neues Projekt" | FormDialog öffnet (POST /api/projects) |
| Navigating | Projekt ausgewählt | Sofortige Navigation (kein Zwischenzustand) |

## 6. Aktionen und Interaktionen

**Backend-Capabilities (vorhanden, kein Gap):**
- `GET /api/projects` → Projektliste (durch apiClient auto `?fields=full`: enthält `sprint_count`, `backlog_count`, `active_sprint`, `archived`)
- `POST /api/projects` → Erstellen (slug, name, prefix Pflicht; color, description optional)

**Aktions-Tabelle:**

| Aktion | Auslöser | Verhalten | Endpoint |
|--------|---------|-----------|---------|
| Projektliste laden | Mount | Fetch → State setzen | GET /api/projects |
| Projekt öffnen | Klick Card | projectStore + Navigate /:slug/home | — |
| Neues Projekt | Klick AddProjectCard (D07) | FormDialog → POST → Reload | POST /api/projects |
| Archivierte toggle | [opt. Toggle, Q02] | client-filter auf archived-Flag | — |

**Gap-Analyse:** Kein Backend-Gap. `active_sprint` im full-Response bereits vorhanden. FormDialog für Create bereits vorhanden.

## 7. Accessibility & Keyboard

- Jede ProjectCard: vollständig als `<button>` oder `<a>`-Element (nicht `div + onClick`)
- Fokus-Reihenfolge: Header → Cards (links→rechts, oben→unten) → AddProjectCard → Rail-Footer
- `Enter` / `Space` auf fokussierter Card → öffnet Projekt
- `Tab` traversiert alle interaktiven Elemente
- Farbbalken nicht einzige Information (Prefix + Name immer sichtbar)
- `aria-label` auf AddProjectCard: `"Neues Projekt anlegen"`
- Card-Screenreader-Text: `"Projekt DD2, DevD 2.0, 3 Sprints, 42 Backlog-Einträge"`
- Grid Loading: `aria-busy="true"` auf Grid-Container
- Error-Banner: `role="alert"` für Screenreader-Ankündigung
- `aria-current="page"` nicht anwendbar (keine aktive Selektion auf ToolHome)

## 8. Storybook-Story-Plan

**Tier:** Screen-Level → `src/storybook/screens/ToolHome/`
**Komponenten-Stories:** `src/storybook/organisms/ProjectCard/`

| Datei | Story-Name | Beschreibung | Mock-Args |
|-------|-----------|-------------|-----------|
| ToolHome.stories.jsx | Default | 4 Projekte, voller Grid | 4× project fixture |
| ToolHome.stories.jsx | Loading | Skeleton-Zustand | isLoading: true |
| ToolHome.stories.jsx | Empty | Keine Projekte + EmptyState | projects: [] |
| ToolHome.stories.jsx | EinProjekt | Edge: 1 Karte (kein Grid-Layout-Bruch) | 1× project fixture |
| ProjectCard.stories.jsx | Default | Vollständige Daten, aktiver Sprint | full project fixture |
| ProjectCard.stories.jsx | KeinAktiverSprint | active_sprint: null | — |
| ProjectCard.stories.jsx | MinimalDaten | Nur Pflichtfelder | {id,slug,name,prefix,color} |
| ProjectCard.stories.jsx | LangerName | Overflow-Verhalten | name: 60-Zeichen-String |

Story-Konvention: PascalCase-Name, `data-ui`-Root-Attribut, Daten nur über args, kein MSW nötig (presentational).

## 9. Komponentenübersicht

**Vorhandene Komponenten (wiederverwenden):**

| Komponente | Pfad | Verwendung |
|-----------|------|-----------|
| AppShellFrame | src/screens/_shell/AppShellFrame.jsx | Layout-Shell |
| NavigationRail | src/ui/organisms/complex/NavigationRail.jsx | Globale Navigation |
| FormDialog | src/ui/organisms/complex/FormDialog.jsx | "Neues Projekt"-Dialog |
| PageTitle | src/ui/organisms/base/PageTitle.jsx | Screen-Titel "Projekte" |
| ToastHost | src/screens/_shell/ToastHost.jsx | Feedback nach Create |
| projectStore | src/lib/projectStore.js | Projekt setzen bei Select |
| useNavigate | react-router-dom | Navigation nach Select |

**Neue Komponenten (erstellen):**

| Komponente | Pfad | Beschreibung |
|-----------|------|-------------|
| ToolHomeScreen | src/ui/screens/ToolHomeScreen.jsx | Presentational Screen |
| ToolHome | src/screens/ToolHome/ToolHome.jsx | Connected Data-Wrapper |
| ProjectCard | src/ui/organisms/base/ProjectCard.jsx | Einzel-Projekt-Karte |

## 10. Offene Fragen

| Code | Frage | Relevanz |
|------|-------|---------|
| Q01 | Archivierte Projekte: Default ausgeblendet (D01) — Toggle erwünscht? | State-Umfang |

## 11. Entscheidungen

| Code | Entscheidung | Begründung |
|------|-------------|-----------|
| D01 | Archivierte Projekte default ausgeblendet — client-Filter auf `archived === 0` | Fokus auf aktive Projekte; kein extra Endpoint nötig |
| D02 | Kein separater full-Fetch nötig — apiClient appended `?fields=full` automatisch | `active_sprint` bereits im GET /api/projects Response |
| D03 | ToolHomeScreen presentational / ToolHome Connected — Trennung Logik + Darstellung | Storybook-als-Samen Prinzip (presentational = direkt storyfähig) |
| D04 | ProjectCard als eigene Datei in `src/ui/organisms/base/` — keine Inline-Komponente | Storyfähigkeit, Wiederverwendung |
| D05 | Route `/home` — Redirect `/ → /home`; `/projects` bleibt als Alias oder wird entfernt | PO-Entscheid: sauberere Semantik, neuer globaler NavItem |
| D06 | NavigationRail auf ToolHome: projekt-spezifische Items ausgeblendet (nicht disabled) | Kein "toter" Zustand sichtbar; schlanker globaler Modus |
| D07 | AddProjectCard im Grid — "Neues Projekt" direkt auf ToolHome via FormDialog | Intuitiv; FormDialog bereits vorhanden |
| D08 | ProjectCard zeigt `description` als 1–2-zeiligen Text unter dem Namen (wenn vorhanden) | Mehr Kontext pro Projekt; optionales Feld |
