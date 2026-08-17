---
type:
description: "Visuelles Design-System: Catppuccin (Latte/Macchiato), Token-Hierarchie, Layer, Spacing, Typografie, UX-Guidelines"
tags: []
aliases: []
relates_to:
uid: 80924e16-5e85-464e-8fc4-996c8c08cbd7
title: Design-System
---

# DESIGN.md — Developer Dashboard (DevD)

> Kein Layout, keine Komponenten. Dieses Dokument beschreibt die Haltung, an der jede spätere Entscheidung gemessen wird.

# Sprit des Tools

## Grundhaltung in einem Satz

Ein Werkzeug, das sich anfühlt, als wäre es von jemandem gebaut, der selbst damit arbeitet — dicht und schnell für die, die es kennen, aber ohne dass man es kennen muss, um anzufangen.

## Kernideen

- Tempo ist ein Feature, nicht eine Optimierung. Jeder Klick, jeder Wechsel, jede Suche soll sich sofort anfühlen. Wahrgenommene Geschwindigkeit schlägt gemessene.
- Zwei Wege, ein Ziel. Maus für Auffindbarkeit, Tastatur für Tempo. Beide sind erstklassig. Wer den schnellen Weg nicht kennt, wird nie blockiert; wer ihn kennt, wird nie ausgebremst.
- Information statt Dekoration. Farbe, Gewicht und Raum tragen Bedeutung. Was nichts kommuniziert, gehört nicht ins Bild.
- Ruhe als Standardzustand. Das Tool drängt sich nicht auf. Aufmerksamkeit zieht nur, was Aufmerksamkeit braucht — Blocker, Abweichung, Konflikt.
- Der Entwickler ist erwachsen. Keine erklärenden Tooltips für Offensichtliches, keine Bestätigungsdialoge für Umkehrbares. Vertrauen in den Nutzer, Undo statt Nachfragen.

## Spannungen und Entscheidungsregeln

Hier liegt der eigentliche Wert. Wenn zwei Werte kollidieren, gilt:

- Dichte vs. Übersichtlichkeit: Im Zweifel mehr Raum. Dichte entsteht durch Weglassen, nicht durch Zusammenquetschen.
- Tastatur vs. Maus: Hochfrequente Aktionen Tastatur-optimieren, alles per Maus erreichbar halten. Nie eine Aktion nur hinter einem Shortcut verstecken.
- Auffindbarkeit vs. Eleganz: Wenn ein Power-Feature unsichtbar bleiben müsste, um elegant zu sein, gewinnt die Auffindbarkeit. Eleganz darf nichts verbergen, was man braucht.
- Konsistenz vs. lokaler Optimierung: Konsistenz gewinnt. Ein Muster, das überall gleich funktioniert, schlägt die lokal bessere Sonderlösung.
- Sofort vs. korrekt: Optimistisch reagieren, im Hintergrund bestätigen. Lieber sofort zeigen und still korrigieren als warten lassen.

## Ästhetische Haltung

- Entwickler-affin, nicht Terminal. Die Dichte und Präzision eines guten CLI, aber als ruhige, klickbare Oberfläche — nicht als Emulation eines Terminals.
- Gedämpft statt grell. Pastellige, kontrastarme Atmosphäre (Catppuccin als Grundton). Kräftige Farbe ist reserviert für Bedeutung: Erfolg, Blocker, aktiver Fokus.
- Monospace als Akzent, nicht als Stimme. Code, IDs und Status sprechen monospace; alles andere spricht ruhig und proportional.
- Stille Bewegung. Übergänge orientieren, sie unterhalten nicht. Schnell, knapp, vorhersehbar.

## Was es nicht ist

- Kein Terminal-Cosplay. Keine ASCII-Rahmen, kein erzwungener Text-only-Look, keine künstliche Befehlszeilen-Romantik.
- Kein Feature-Schaufenster. Sichtbarkeit folgt Häufigkeit, nicht Stolz auf die Funktion.
- Kein Stakeholder-kompromittiertes Universaltool. Die Zielgruppe ist der bauende Entwickler; externe Rollen bekommen reduzierte Sichten, diktieren aber nicht den Kern.
- Kein lautes Tool. Keine Badges, Konfetti, Notification-Lawinen oder Aufmerksamkeit ohne Anlass.

## Lackmustest

Bei jeder Detailentscheidung: Macht das die Arbeit eines Entwicklers, der das Tool täglich nutzt, spürbar schneller oder ruhiger? Wenn nein, gehört es nicht hinein — egal wie hübsch oder „modern" es ist.

---

# UI-Design Grundlagen

## 1. UI/UX-Konzept und Design-System

### 1.1 Design-Philosophie

**Stilrichtung:** Technisches Power-Tool. Hohe Informationsdichte. Terminal-nah ohne Terminal-Pose.

**Mood:** Präzise, ruhig, vertrauenswürdig. Zeigt den Maschinenraum (Keys, Status, Logs) statt ihn zu kaschieren.

**Inspirationsreferenzen:** Linear (Dichte, Tastatur), Raycast (Tempo), Stripe Dashboard (lesbare Datentiefe).

**Zielnutzer:** PO/Developer am Desktop — oft abends, in konzentrierter Arbeitsphase. Latte-Theme am Tag, Macchiato bei wenig Umgebungslicht. Kein Theme aus Coolness.

**Barrierefreiheit (WCAG):**

- `prefers-reduced-motion` zentral in `index.css` abgedeckt: Durations → 1ms, Keyframes neutralisiert (WCAG 2.3.3)
- Keyboard-Focus: uniformer `--focus-ring` (lavender) auf allen interaktiven Atomen (`focus-visible:ring-2 ring-offset-2`)
- Touch-Targets: min 44×44px
- Input-Schriftgröße: 16px (iOS-Zoom-Schutz)
- Kontrast: `--heading-accent` = `var(--red)` in Latte (peach 1.93 auf surface0 → WCAG AA fail; red 3.52 = AA-large bestanden)

**Negative Constraints (nie brechen):**

- Kein Purple-Pink-Gradient, kein `background-clip:text`-Gradient-Text
- Keine identischen Card-Grids / Hero-Metric-Kacheln mit großer Zahl + Gradient-Akzent
- Keine verschachtelten Cards
- Keine dekorativen Side-Stripe-Borders (Ausnahme: `.status-*` und Priority-Stripes als etablierte Affordanz)
- Keine Bounce-/Elastic-Motion; keine CSS-Layout-Properties animieren (nur `transform`/`opacity`)
- Kein Modal-First-Reflex: inline / progressive Alternativen bevorzugen

---

### 1.2 Farbschema, Typografie und Ikonographie

#### Farbsystem: Catppuccin

Zwei gleichwertige Themes via `html[data-theme]`:

- **Light = Latte** (Default, wenn kein `data-theme` → `prefers-color-scheme` greift)
- **Dark = Macchiato**

Umschaltung: `AppShell.jsx` setzt `data-theme` auf `<html>`-Element.

**Grundregel:** Komponenten nutzen **semantische Accent-Tokens** (`--accent-*`), nie Catppuccin-Rohfarben direkt. Rohfarben nur für Tags, Priority und Status-Stripes.

**Semantic Accent Tokens:**

| Token | Latte (Light) | Macchiato (Dark) | Rolle |
|---|---|---|---|
| `--accent-primary` | `#fe640b` (peach) | `#f5a97f` | Primäre Aktion (eine pro View) |
| `--accent-success` | `#40a02b` (green) | `#a6da95` | Done / Passed |
| `--accent-danger` | `#d20f39` (red) | `#ed8796` | Rejected / destruktiv |
| `--accent-warning` | `#df8e1d` (yellow) | `#eed49f` | Achtung / Abnahme |
| `--accent-info` | `#209fb5` (sapphire) | `#7dc4e4` | Info / Links / Refined |
| `--on-accent` | `#ffffff` | `#11111b` | Text auf gefülltem Akzent |
| `--heading-accent` | `var(--red)` | `var(--peach)` | Slot-Heading-Akzent (Layer-5, sanktioniert) |

**Neutral / Surface (Latte → Macchiato):**

| Token | Light | Dark | Schicht |
|---|---|---|---|
| `--crust` | `#dce0e8` | `#181926` | Tiefste Ebene, Off-Canvas-BG |
| `--mantle` | `#e6e9ef` | `#1e2030` | Erhöhte Panels, Drawer-Body |
| `--base` | `#eff1f5` | `#24273a` | Seiten-BG, Karten-Innenflächen |
| `--surface0/1/2` | `#ccd0da/#bcc0cc/#acb0be` | `#363a4f/#494d64/#5b6078` | Borders, Hover-Stufen |
| `--text` | `#4c4f69` | `#cad3f5` | Primärer Fließtext |
| `--subtext1/0` | `#5c5f77/#6c6f85` | `#b8c0e0/#a5adcb` | Sekundärtexte |

**Semantische 6-Ebenen-Leiter (Layer-Tokens):**

| Ebene | Token | Dark | Light | Schicht |
|---|---|---|---|---|
| Background | `--layer-bg` | `crust` | `base` | App-Fläche + content-outlet |
| Layer-1 | `--layer-1` | `mantle` | `mantle` | Rail/Topbar, PageTitle |
| Layer-2 | `--layer-2` | `base` | `crust` | ContentWrapper |
| Layer-3 | `--layer-3` | `surface0` | `surface0` | DetailsWrapper / WidgetBase |
| Layer-4 | `--layer-4` | `surface1` | `surface1` | DetailsSection / Bausteine im Widget |
| Layer-5 | `--heading-accent` | `peach` | `red` | Vordergrund (kein Fill) |

**Elevation / Schatten:**

- `--shadow-card`: Light `0 1px 2px rgba(76,79,105,.06), 0 2px 6px rgba(76,79,105,.04)` · Dark `0 1px 2px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.25)`
- `--shadow-pop`: Light `0 8px 24px rgba(76,79,105,.15)` · Dark `0 8px 24px rgba(0,0,0,.5)`
- Elevation primär über Surface-Stufe + Border, Schatten sparsam

**Borders:**

- `--border`: `color-mix(in srgb, var(--text) 14%, transparent)` — sichtbar auf jeder Surface (behebt Surface0-auf-Surface0-Kollaps)
- `--focus-ring`: `var(--lavender)` — uniforme Keyboard-Affordance (theme-folgt)

**Priority-Skala (eigene Skala, kein `--accent-*`):**

`--priority-1: red` · `-2: peach` · `-3: blue` · `-4: teal` · `-5: overlay0`

**Status-Farben:**

`peach`=pending/in_progress · `green`=passed/done · `red`=rejected · `blue`=info/refined · `mauve`=to_review

---

#### Typografie

| Rolle | Schriftart | Klasse / Eigenschaft |
|---|---|---|
| Display (H2–H6, Buttons, Tabs, Issue-Keys) | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | `.font-display`, `letter-spacing: -0.01em` |
| Body / Inputs / Selects / Textareas | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Standard, `letter-spacing: normal` |
| Mono-Daten (Keys, Pfade) | JetBrains Mono | `font-family: var(--font-display)` |

**Kritisch:** Font-Import `@import` muss VOR `@import "tailwindcss"` stehen, sonst verwirft CSS den Import. Gewicht 500 und 700 geladen.

---

#### Ikonographie

- **Ausschließlich Lucide** (`lucide-react ^1.11.0`) — kein Emoji, keine ad-hoc-Glyphen
- Editier-Affordanz: `Pencil` / `SquarePen`; Schließen: `X`; Grip: `GripVertical`
- Tree-Shaken Import (nur verwendete Icons im Bundle)

---

#### Motion-Tokens

**Durations (`:root`, via `duration-[var(--duration-*)]`):**

- `--duration-fast: 120ms` — Hover/Press
- `--duration-base: 180ms` — Standard
- `--duration-slow: 280ms` — Drawer/Overlay

**Easings (`@theme`):**

- `ease-standard: cubic-bezier(.2,0,0,1)` — dezeleriert (Standard)
- `ease-emphasized: cubic-bezier(.05,.7,.1,1)` — Enter/Exit betont

**Regeln:**

- Button-Press: `active:scale-[0.97]` via `--duration-fast / ease-standard`
- Drawer-Entry: `.devd-anim-slide-right` (200ms ease-out), Backdrop `.devd-anim-fade` (150ms)
- `prefers-reduced-motion: reduce` → alle Durations → 1ms, Keyframes und Press-Transform neutralisiert

---

### 1.3 Komponentenbibliothek und Storybook

**Storybook 10.4.6** (GF-2 = Greenfield-2, zweite Component-Library-Generation)

**Atomares Design:**

```
src/components/ui/
  atoms/        → Basisbausteine (Button, Input, Badge, Icon)
  molecules/    → Komposita (Card, Field-Group, TabBar)
  organisms/    → Komplexe Einheiten (Drawer, Kanban-Card, Widget)
  templates/    → Layout-Archetypen (7 registrierte Typen)
```

**Storybook-Compliance-Gates:**

- `data-ui`-Attribute-Allowlist: `specs-DD/01-PRD-SAD-FSD/architecture/data_ui_attr_allowlist.txt`
- `view-must-use-archetype` ESLint-Regel (scripts/eslint-rules/)
- MSW 2.14.6 als Storybook-Addon (gemockte API in Stories)
- Zwei sanktionierte Archetype-Ausnahmen: `AppShell.jsx` (globale Shell) + `CaptureView.jsx` (eigenständige PWA)

### 1.4 Layout-Raster und Responsivität

**Spacing-Tokens (4px-Grid):**

| Token | Wert |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |

Rhythmus variieren — nicht überall identisches Padding.

**Breakpoints:**

| Breakpoint | Bereich | Verhalten |
|---|---|---|
| Mobile | < 640px | Einspaltig, einhändig, kurze Eingaben, Bottom-Nav, Drawer full-width |
| Tablet | 640–1024px | Mehrere Spalten, Top-TabBar, kein Sidebar |
| Desktop | > 1024px | Dicht, mehrspaltig, Sidebar sichtbar, tastaturgetrieben |

**Container:** max-width ~1180–1280px, zentriert.

**Scrollbars:** Dezent im Catppuccin-Stil (thin, Thumb `--surface1` → hover `--surface2`).

### 2.3 State Management

**Kein dediziertes State-Management-Framework** (kein Redux, Zustand, Jotai in `package.json`).

| Ebene | Technologie | Einsatz |
|---|---|---|
| Lokaler State | `useState` / `useReducer` | Komponent-interne UI-States |
| Globaler State | React Context API (`src/contexts/`) | Theme, Auth-State, aktives Projekt, Sprint-Kontext |
| Server-Cache | Workbox Runtime-Cache | API-Antworten (NetworkFirst, 5min TTL, max 60 Einträge) |
| Datenabfrage | Custom Hooks (`src/hooks/`) | Fetching + abgeleiteter State aus REST-API |

**Kein Optimistic-Update-Framework** sichtbar — Mutations via `fetch` → Refetch.

---

### 2.4 Routing-Konzept und Navigationsstruktur

**React Router** (inferred aus View-Struktur und `main.jsx`-Entry).

**Zwei Entry-Points:**

1. **Haupt-App** (admin, auth-geschützt via Authelia): vollständige AppShell
2. **Capture-PWA** (`issues.familie-riedel.org`, öffentlich): `CaptureView.jsx` — eigene Shell, nur `GET /api/projects/list-minimal` + `POST /api/issues`

**Erwartete Route-Struktur:**

| Route | View | Archetyp |
|---|---|---|
| `/` | `HomeDashboard.jsx` | `DashboardPage` |
| `/projects` | `ProjectsLanding.jsx` | `ListPage` |
| `/:slug/home` | `ProjectHomeView.jsx` | `ProjectHomeLayout` |
| `/:slug/sprint/:id` | `SprintDetail.jsx` | `ListPage` / `BoardPage` |
| `/:slug/sprint/:id/review` | `SprintReviewV2.jsx` | `DashboardPage` |
| `/:slug/roadmap` | `RoadmapBoard.jsx` | `BoardPage` |
| `/:slug/milestones/:id` | `MilestoneDetail.jsx` | `MasterDetail` |
| `/:slug/memory` | `MemoryView.jsx` / `ProjectMemoryView.jsx` | `ListPage` |
| `/:slug/issues/:id` | `ItemDetail.jsx` | `MasterDetail` |
| `/settings` | `GlobalSettings.jsx` | `FormPage` |
| `/:slug/settings` | `ProjectSettings.jsx` | `FormPage` |
| `/capture` | `CaptureView.jsx` | eigenständig (sanktioniert) |

**Navigation:**

- Desktop: AppRail (Rail-Navigation links) + Topbar
- Mobile: Bottom-Nav (`mobileTabBar`-Slot in ProjectHomeLayout)
- Theme-Schalter: in AppShell, setzt `html[data-theme]`

---

## 3. Datenfluss und API-Integration

### 3.1 Datenabfrage-Strategie

**REST-Client:** Native `fetch()` via Custom Hooks in `src/hooks/`.

**Dev-Proxy (Vite):**

```
/api      → DEVD_PROXY_TARGET || http://localhost:5556
/uploads  → DEVD_PROXY_TARGET || http://localhost:5556
/ws       → ws://... (WebSocket-Upgrade)
```

**Umgebungen:**

| Script | Proxy-Ziel |
|---|---|
| `dev` | `localhost:5556` (lokaler Express-Server) |
| `dev:nas` | NAS-API via `DEVD_PROXY_TARGET` |
| `dev:wt1` / `dev:wt2` | Worktree-isolierte NAS-API-Targets |

**MCP-Server:** `@modelcontextprotocol/sdk 1.29.0` — KI-Agenten-Schnittstelle für Issues, Sprints, Projects, Memory, SSTD-Werkzeuge (läuft via `npm run mcp:devd`).

**WebSocket:** Echtzeit-Updates auf Ticket-/Sprint-Ebene (`/ws`-Route im Express-Backend).

---

### 3.2 Datentransformation und Validierung

**Shared Validation:** Zod-Schemas in `contracts/` — genutzt von CLI, MCP und REST-Backend.

**Typ-Inferenz:** `z.infer<typeof Schema>` via JSDoc `@typedef` (kein TypeScript-Compile-Step für `src/`).

**MSW (Mock Service Worker):** In Storybook-Stories und Tests; `workerDirectory: 'public/'`; ermöglicht realistische API-Simulation ohne Backend.

**Clientseitige Validierung:** Zod-Contract-Schemas verwendbar im Frontend (selbe Validation-Logik wie Backend).

---

### 3.3 Offline-Fähigkeit und lokale Datenspeicherung

**PWA / Workbox Service Worker:**

| Ressource | Strategie | TTL / Limit |
|---|---|---|
| App-Shell (`*.js/.css/.html/.svg/.png`) | Precache | Deploy-gebunden |
| API (`/api/*`) | NetworkFirst (3s Timeout → Cache-Fallback) | 5min TTL, max 60 Einträge |
| Bilder | CacheFirst | 30 Tage, max 100 Einträge |
| Auth-Subdomain (`auth.*`) | NetworkOnly | nie gecacht |
| Authelia-Redirects (`/auth`) | navigateFallbackDenylist | blockiert |

**Update-Verhalten:**

- `registerType: 'autoUpdate'` — kein Update-Prompt (Single-User-Heimnetz)
- `skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true` — löst "Reload Page = Empty Page"-Bug nach Deploy (DD-327)

**Lokale Datenspeicherung:**

- Kein IndexedDB / LocalStorage für Applikationsdaten
- Master-DB: SQLite auf NAS (`/volume2/docker/devd/data/devd.db`)
- Offline-Schreiboperationen: nicht unterstützt (Network-First-only für API-Mutations)

---

## 4. Performance und Optimierung

### 4.1 Rendering-Strategien

**Client-Side Rendering (CSR):**

- Vite + React 19 SPA
- Kein SSR / SSG

**Code-Splitting:**

- Vite-Standard-Chunking (vendor-separiert)
- React 19 `use()` / Concurrent Features für asynchrone State-Übergänge
- Storybook-Build: eigener statischer Build (`storybook-static/`)

**HMR:** Vite HMR im Dev-Modus; `devOptions.enabled: false` (kein SW im Dev → verhindert Stale-Chunk-Bugs).

**React 19 Features:** `useTransition`, `useDeferredValue` verfügbar für nicht-blockierende UI-Updates.

---

### 4.2 Asset-Management

| Asset-Typ | Strategie |
|---|---|
| JS / CSS / HTML | Vite: gehashte Dateinamen, Immutable-Cache-Header (via Workbox Precache) |
| Icons | Lucide SVG — Tree-Shaken, inline SVG (kein Icon-Sprite) |
| Schriften | JetBrains Mono via CSS `@import` (muss vor `@import "tailwindcss"` stehen) |
| Bilder | CacheFirst 30 Tage via Workbox |
| PWA-Icons | `icons/pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png` |

---

### 4.3 Performance-Budgets und Metriken

**Kein explizites Budget-Dokument** im Archiv definiert. Implizite Metriken aus den Implementierungen:

| Metrik | Ziel / Implementierung |
|---|---|
| API-Latenz (offline) | 3s Timeout → Cache-Fallback (Workbox NetworkFirst) |
| Cache-Trefferrate | Precache aller Shell-Assets; API max 60 Einträge |
| Touch-Target | min 44×44px (WCAG 2.5.5) |
| Input-Font | 16px (iOS-Zoom-Prävention) |
| Motion | `prefers-reduced-motion` → 1ms (WCAG 2.3.3) |
| Kontrast | `--heading-accent` WCAG-AA-large-geprüft |
| Bundle-Größe | Lucide Tree-Shaking; Tailwind v4 Just-in-Time |
| FCP / LCP | Workbox Precache Shell; kein Waterfall für kritische Ressourcen |

**Empfehlung für künftige Budget-Definition:**

- LCP < 2.5s (Workbox precache sichert Shell → First-Paint schnell)
- CLS = 0 (keine ungekennzeichneten Layout-Shifts; Skeleton-States fehlen noch)
- INP < 200ms (React 19 Concurrent + `active:scale-[0.97]` als Press-Feedback)
