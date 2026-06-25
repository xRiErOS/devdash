# DESIGN.md — Developer Dashboard (DevD)

Single Source of Truth für die visuelle Sprache. Werte sind aus `src/index.css` extrahiert (nicht erfunden). Token-Master bleibt `src/index.css`; dieses Dokument spiegelt es für KI-konsumierbare Specs und Mockups. Bei Konflikt gewinnt `src/index.css`.

## 1. Visual Theme & Atmosphere

- Stilrichtung: technisches Power-Tool, hohe Informationsdichte, terminal-nah ohne Terminal-Pose.
- Mood: präzise, ruhig, vertrauenswürdig. Zeigt den Maschinenraum (Keys, Status, Logs) statt ihn zu kaschieren.
- Farbwelt: Catppuccin. **Light = Latte (Default)**, **Dark = Macchiato**. Beide gleichwertig.
- Inspirations-Referenzen: Linear (Dichte, Tastatur), Raycast (Tempo), Stripe-Dashboard (lesbare Datentiefe).
- Theme-Begründung (Szene): PO arbeitet konzentriert am Desktop, oft abends; Latte am Tag, Macchiato bei wenig Umgebungslicht. Kein Theme ist „der Default aus Coolness“ — Umschaltung via `html[data-theme]`, ohne Theme folgt `prefers-color-scheme`.

## 2. Color Palette & Roles

Alle Farben als CSS-Variablen. Komponenten nutzen **semantische Accent-Tokens** (`--accent-*`), nicht die Catppuccin-Rohfarben direkt. Rohfarben bleiben für Tags, Priority und Status-Stripes.

### Neutral / Surface (Light Latte → Dark Macchiato)

- `--crust`  `#dce0e8` → `#181926` — tiefste Ebene (Off-Canvas-Hintergrund, Button-Text auf Akzent)
- `--mantle` `#e6e9ef` → `#1e2030` — erhöhte Panels, Drawer-Body
- `--base`   `#eff1f5` → `#24273a` — Seiten-Hintergrund, Karten-Innenflächen
- `--surface0/1/2` — Borders + Hover-Stufen (`#ccd0da/#bcc0cc/#acb0be` → `#363a4f/#494d64/#5b6078`)
- `--overlay0/1` — gedämpfte Labels, Grips (`#9ca0b0/#8c8fa1` → `#6e738d/#8087a2`)
- `--text` `#4c4f69` → `#cad3f5`; `--subtext1` `#5c5f77` → `#b8c0e0`; `--subtext0` `#6c6f85` → `#a5adcb`

### Akzent-Rollen (semantisch — diese verwenden)

- `--accent-primary: var(--peach)` — primäre Aktion pro View (`#fe640b` → `#f5a97f`)
- `--accent-success: var(--green)` — passed / done (`#40a02b` → `#a6da95`)
- `--accent-danger:  var(--red)` — rejected / destruktiv (`#d20f39` → `#ed8796`)
- `--accent-warning: var(--yellow)` — Abnahme / Achtung (`#df8e1d` → `#eed49f`)
- `--accent-info:    var(--sapphire)` — Info / refined / Links (`#209fb5` → `#7dc4e4`)
- `--on-accent` — Text auf gefülltem Akzent (`#ffffff` Light, `#11111b` Dark; Macchiato-Pastell braucht dunklen Text)
- `--heading-accent` — Slot-Heading-Akzent (Layer-5), theme-spezifisch `var(--peach)` Dark / `var(--red)` Light. Sanktionierte *stehende* Akzent-Rolle (Ausnahme zu „Akzent nur interaktiv"), klein gehalten (Dot + Titel). Light=red, weil helle Catppuccin-Akzente Latte-AA failen (peach 1.93 auf `surface0`); red 3.52 = AA-large.

### Catppuccin-Rohfarben (nur Tags / Priority / Status)

`--blue --mauve --lavender --teal` zusätzlich verfügbar. Status-Farb-Mapping: `peach`=pending/in_progress, `green`=passed/done, `red`=rejected, `blue`=info/refined, `mauve`=to_review.

### Priority-Skala (eigene Skala, NICHT --accent-*)

`--priority-1: red` · `-2: peach` · `-3: blue` · `-4: teal` · `-5: overlay0`. Badges `.badge-p1..p5`.

## 3. Typography

- Display (Headings h2–h6, Buttons, Tabs, Issue-Keys): `--font-display` = `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`, `letter-spacing: -0.01em`. Klasse `.font-display`.
- Body / Inputs / Selects / Textareas: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, `letter-spacing: normal` (explizit zurückgesetzt, erbt NICHT die Display-Regel).
- Mono-Daten (Keys, Pfade): JetBrains Mono.
- Font-Import muss VOR `@import "tailwindcss"` stehen (sonst verwirft CSS den Import).
- Hierarchie über Größe + Gewicht (500/700 geladen), nicht über Flat-Scales.

## 4. Component Stylings

### Button
- Primär: `background: var(--accent-primary)`, Text `--on-accent`, Radius 8px, Padding ~8px 16px, `font-display`, weight 600.
- Ghost: transparent, Border 1px `--surface1`, Text `--subtext0`.
- Link: transparent, Text `--accent-info`, unterstrichen.
- Focus: `:focus-visible` → 2px Peach-Outline, 2px Offset (Inset −2px in `[role=radiogroup]`).

### Input / Select / Textarea
- Hintergrund `--base`, Border 1px `--surface0`, Radius ~8px, System-Font, 16px (Mobile-Zoom-Schutz).
- Focus: `box-shadow: 0 0 0 2px var(--peach)`, Offset 0.

### Card / Tile (Kanon: `.milestone-tile`)
- `background: var(--base)`, Border 1px `--surface0`, Radius 12px, Padding `--space-3`, Flex-Column, Gap `--space-2`.
- Hover: Border `--surface1`, `box-shadow: 0 4px 14px rgba(0,0,0,.05)`, transition 140ms.
- Titel: `font-display`, 14px/700, `--accent-info`, dezent unterstrichen (Underline-Offset wächst bei Hover).
- Niemals verschachtelte Cards.

### Drawer / Off-Canvas (Refinement-Panel, Mobile-Nav)
- Rechts-Drawer: `background: var(--mantle)`, `border-left: 1px solid var(--surface1)`, `box-shadow: var(--shadow-pop)`.
- Eintritt: `.devd-anim-slide-right` (200ms ease-out); Backdrop `.devd-anim-fade` (150ms).
- Struktur: `dhead` (Border-bottom surface0) · `dbody` (scroll) · `dfoot` (Border-top surface0).

### Icons
- **Ausschließlich Lucide** (`lucide-react ^1.11.0`, bereits projektweit im Einsatz). Keine Emoji, keine ad-hoc-Glyphen.
- Editier-Affordanz: Lucide `Pencil` / `SquarePen`. Schließen: `X`. Grip: `GripVertical`.

### Review-Hintergründe
`.review-passed/.review-partially_passed/.review-not_passed` = `color-mix(in srgb, <accent> 15%, transparent)`.

## 5. Layout Principles

- Spacing: 4px-Grid-Tokens `--space-1..6` (4/8/12/16/20/24). Rhythmus variieren, nicht überall gleiches Padding.
- Container max ~1180–1280px, zentriert.
- Nicht alles in einen Container wickeln; Cards nur wo sie die beste Affordanz sind.
- Scrollbars dezent im Catppuccin-Stil (thin, Thumb `--surface1` → hover `--surface2`).

## 6. Depth & Elevation

- `--shadow-card`: Light `0 1px 2px rgba(76,79,105,.06), 0 2px 6px rgba(76,79,105,.04)` · Dark `0 1px 2px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.25)`.
- `--shadow-pop`: Light `0 8px 24px rgba(76,79,105,.15)` · Dark `0 8px 24px rgba(0,0,0,.5)`.
- Surface-Hierarchie: `crust` < `mantle` < `base` (höher = näher am Nutzer). Schatten sparsam, Elevation primär über Surface-Stufe + Border.

### Semantische 6-Ebenen-Leiter (`--layer-*`, PO 2026-06-20)

EntityDetail/AppShell wählen NICHT direkt ein Surface-Token, sondern eine **semantische Ebene** (`--layer-*`, Master `index.css`). Die Leiter ist pro Theme **monoton** (Dark dunkel→hell, Light hell→dunkel nach vorne):

| Ebene | Token | Schicht | Dark | Light |
|---|---|---|---|---|
| Background | `--layer-bg` | App-Fläche + content-outlet | `crust` | `base` |
| Layer-1 | `--layer-1` | Rail/Topbar · PageTitle · Page-Base | `mantle` | `mantle` |
| Layer-2 | `--layer-2` | ContentWrapper (Accordion: Titel+Content = eine Ebene) | `base` | `crust` |
| Layer-3 | `--layer-3` | DetailsWrapper (WidgetBase) | `surface0` | `surface0` |
| Layer-4 | `--layer-4` | DetailsSection (Bausteine im Widget) | `surface1` | `surface1` |
| Layer-5 | `--heading-accent` + Text/Pills | Vordergrund (kein Fill) | `peach` | `red` |

Layer-1/3/4 (`mantle/surface0/surface1`) sind auto-theme-monoton (eine `:root`-Definition, kippt mit dem Theme); Background+Layer-2 swappen `crust↔base` (Override in den Theme-Blöcken). Detail-Single-Source: Storybook **01.15 Color Hierarchy**.

### Borders & Focus (GF-215)

- `--border`: subtile Kontrast-Linie (`color-mix(in srgb, var(--text) 14%, transparent)`) — sichtbar auf JEDER Surface (behebt Surface0-auf-Surface0-Kollaps). Karten/Container nutzen `border-[var(--border)]`, nicht mehr hart `--surface0`.
- `--focus-ring`: uniforme Keyboard-Affordance = `var(--lavender)` (folgt dem Theme). Interaktive Atome: `focus-visible:ring-2 ring-[var(--focus-ring)] ring-offset-2 ring-offset-[var(--base)]`. **Provisorisch** — bewährt sich erst mit Form-Feldern (re-eval bei 04 Molecules).

### Motion (GF-214)

- Duration-Tokens (`:root`, via `duration-[var(--duration-*)]`): `--duration-fast 120ms` (Hover/Press), `--duration-base 180ms` (Standard), `--duration-slow 280ms` (Drawer/Overlay).
- Easing-Tokens (`@theme`, via `ease-standard`/`ease-emphasized`): `--ease-standard cubic-bezier(.2,0,0,1)` (dezeleriert), `--ease-emphasized cubic-bezier(.05,.7,.1,1)` (Enter/Exit betont).
- Button-Press = `active:scale-[0.97]`; Transition über `--duration-fast`/`ease-standard`.
- `@media (prefers-reduced-motion: reduce)`: Durations → 1ms, Drawer-Keyframes + Press-Transform neutralisiert (WCAG 2.3.3, zentral in `index.css`).

## 7. Do's and Don'ts

✓ Semantische Accent-Tokens (`--accent-primary` etc.) für Aktionen; nur EINE primäre Aktion pro View.
✓ JetBrains Mono für Headings/Buttons/Keys; System-Font für Body/Inputs.
✓ Lucide-Icons (kuratiertes Registry, GF-213); uniformer `--focus-ring` (lavender); `prefers-reduced-motion` respektieren (zentral, GF-214).
✓ Beide Themes (Latte/Macchiato) gleichwertig prüfen.
✗ NIEMALS Emoji als UI-Icons.
✗ NIEMALS Purple-Pink-Gradients; KEIN `background-clip:text`-Gradient-Text.
✗ NIEMALS identische Card-Grids oder Hero-Metric-Kacheln (große Zahl + Label + Gradient-Akzent).
✗ NIEMALS verschachtelte Cards; nicht alles in einen Container wickeln.
✗ KEINE dekorativen Side-Stripe-Borders. **Einzige sanktionierte Ausnahme**: `.status-*` und Priority-Stripes (`border-left: 4px`) als etablierte Status-Affordanz — niemals als generischer Karten-Schmuck.
✗ KEINE Bounce-/Elastic-Motion; CSS-Layout-Properties nicht animieren (nur transform/opacity).
✗ KEINE Modal-First-Reflexe; inline / progressive Alternativen zuerst.

## 8. Responsive Behavior

- Mobile <640px, Tablet 640–1024px, Desktop >1024px.
- Touch-Target min 44×44px; Inputs 16px (iOS-Zoom-Schutz).
- Desktop: dicht, mehrspaltig, tastaturgetrieben. Mobile (PWA Issue-Capture): einspaltig, einhändig, kurze Eingaben.
- Drawer: Desktop fest 480px rechts; Mobile als Full-Width Off-Canvas mit Slide-in.

## 10. Sanktionierte Shell-Varianten (DD-417)

Der Archetyp-Enforcement-Guard (DD-428/429) prüft, ob View-Dateien außerhalb eines Archetyp-Wrappers eigene Top-Level-Layout-Primitives aufspannen. Die folgenden zwei Shell-Varianten sind **bewusst sanktioniert** und dürfen NICHT als Drift geflaggt werden.

### Variante A — Theme-Schalter (Latte / Macchiato)

- **Mechanismus:** `html[data-theme="latte"]` / `html[data-theme="macchiato"]`, gesetzt via `AppShell.jsx`.  
  Ohne explizites Attribut greift `prefers-color-scheme` (System-Default = Latte bei Light, Macchiato bei Dark).
- **Betroffene Dateien:** `src/components/Layout.jsx`, `src/views/AppShell.jsx`
- **Begründung:** Theme-Umschaltung ist globale Dokument-Eigenschaft — kein Layout-Primitive, kein Archetyp-Verstoß. `AppShell.jsx` darf `data-theme` auf dem `<html>`-Element setzen ohne Archetyp-Wrapper.
- **Guard-Allowlist-Eintrag:** `AppShell.jsx` → globale Shell, kein Archetyp-Scope-Check.

### Variante B — Capture-Host PWA-Shell (issues.familie-riedel.org, DD-375)

- **Mechanismus:** `src/views/CaptureView.jsx` rendert eine eigene minimale PWA-Shell ohne App-Nav, ohne Sidebar, ohne Sprint-Kontext. Läuft auf `issues.familie-riedel.org` (öffentlich, kein Authelia).
- **Betroffene Dateien:** `src/views/CaptureView.jsx`, `src/views/ProjectScope.jsx`
- **Begründung:** Capture-Host ist eine eigenständige, öffentliche Capture-PWA — absichtlich abgekoppelt von der Admin-Shell. Sie stellt keine View im Sinne der Archetyp-Schicht dar, sondern einen eigenen Entry-Point.
- **API-Allowlist (captureHostGuard.js):** nur `GET /api/projects/list-minimal` + `POST /api/issues` — alles andere → 403.
- **Guard-Allowlist-Eintrag:** `CaptureView.jsx`, `ProjectScope.jsx` → Capture-Entry-Point, kein Archetyp-Scope-Check.

> Beide Varianten sind in `server/lib/captureHostGuard.js` (Backend) resp. `AppShell.jsx` (Frontend) implementiert. Erweiterungen an diesen Files MÜSSEN die jeweilige Guard-Allowlist manuell aktualisieren (s. Task 5, DD-428/429).

### Archetypen-Katalog (Guard-Registrierung)

Die folgenden Archetypen sind im ARCHETYPES-Set von `scripts/eslint-rules/view-must-use-archetype.js` registriert. Eine View, deren Root einer dieser Komponenten ist, gilt als archetype-konform.

| Archetyp | Datei | Zweck |
|---|---|---|
| `PageShell` | `src/components/ui/layout/PageShell.jsx` | Basisrahmen mit max-width + Padding |
| `ListPage` | `src/components/ui/templates/ListPage.jsx` | Einspaltige Listen-View + Collection-Slot |
| `MasterDetail` | `src/components/ui/templates/MasterDetail.jsx` | Zweispaltig: Master-Liste + Detail-Pane |
| `BoardPage` | `src/components/ui/templates/BoardPage.jsx` | Horizontales Kanban-Board |
| `FormPage` | `src/components/ui/templates/FormPage.jsx` | Formular-View (classic / settings / modal) |
| `DashboardPage` | `src/components/ui/templates/DashboardPage.jsx` | Dashboard mit Summary-Cards + Grid |
| `ProjectHomeLayout` | `src/components/ui/templates/ProjectHomeLayout.jsx` | 3-Spalten-Projekt-Hub: Breadcrumb → PageHeading → TabBar → Main+Sidebar → BottomSlot (DD-481/DD-468) |

#### ProjectHomeLayout — Slot-Vertrag

Responsives 3-Spalten-Grid-Gerüst für den Projekt-Hub (`/:slug/home`). Kein Domain-Wissen — rein präsentational.

| Slot | Typ | Beschreibung |
|---|---|---|
| `breadcrumb` | ReactNode? | Optionale Breadcrumb-Zeile (ganz oben, `--mantle`-Hintergrund) |
| `pageHeading` | ReactNode? | Optionaler H1-Block zwischen Breadcrumb und TabBar |
| `tabBar` | ReactNode? | Top-Tab-Bar (Tablet + Desktop; auf Mobile ausgeblendet) |
| `mobileTabBar` | ReactNode? | Bottom-Nav, nur auf Mobile (statt Top-TabBar) |
| `mainContent` | ReactNode? | Hauptinhalt (breite linke Spalte) |
| `sidebar` | ReactNode? | Rechte Spalte; nur Desktop >= 1024px; bei `sidebarCollapsed` 48px-Stub |
| `bottomSlot` | ReactNode? | Spannt beide Spalten; auf Mobile ausgeblendet; auf Tablet/Desktop als 2er-Grid |
| `sidebarCollapsed` | boolean? | Kollabiert Sidebar auf 48px-Stub (Collapse-State beim Aufrufer) |
| `contentPadding` | string? | Überschreibt horizontales + unteres Padding im Content-Grid (Default `var(--space-5,20px)`) |
| `dataUiScope` | string? | Wurzel-`data-ui`-Bereich (Default `'project-home-layout'`) |
| `className` | string? | Zusätzliche Klassen am Wurzel-Element |

Implementierung: `src/components/ui/templates/ProjectHomeLayout.jsx` · Stories: `Templates/ProjectHomeLayout`

## 9. Agent Prompt Guide

- Vor dem Bauen neuer Komponenten: Token-Werte oben referenzieren, dann implementieren. Keine Hex-Literale in Komponenten — immer `var(--token)`.
- Bei Stil-Konflikt: `src/index.css` ist Token-Master, dieses File ist die Erklärung. PRODUCT.md liefert das „warum“.
- Negative Constraints aus Section 7 sind hart — nie brechen.
- Mockups MÜSSEN ins aktuelle Layout eingebettet aussehen (echte Tokens, echte Drawer-/Tile-Patterns), nicht als isolierte Standalone-HTML mit Fremd-Optik. Default-Theme im Mockup = Latte, sofern nicht anders gefordert.
