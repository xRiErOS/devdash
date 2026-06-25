# Product

## Register

product

## Users

Primär ein einzelner Power-User: der Product Owner (Erik), der mehrere Software-Projekte gleichzeitig steuert (MyBaby, DevD-Dogfooding, CONOS, Selene u.a.). Kontext: fokussierte Arbeitssitzungen am Desktop (`devdash.familie-riedel.org`, hinter Authelia/2FA), in denen Sprints geplant, Backlog-Issues refined und KI-Agenten-Ergebnisse live reviewt werden. Hohe Vertrautheit mit dem Tool: kennt jedes Feld, jeden Status, jeden Shortcut.

Sekundärer mobiler Kontext: schnelle Issue-Erfassung unterwegs via PWA (`issues.familie-riedel.org`) — kurze Eingaben, eine Hand, Touch. **Dieser Pfad ist in der aktuellen Frontend-Rebuild-Phase (GF-2 Phase 2) bewusst zurückgestellt** (Desktop-Fokus, s. „Responsive & Geräte"), bleibt aber strategisches Ziel.

Nicht-menschliche Konsumenten: KI-Agenten (Coordinator, Coding Lead, Reviewer) lesen und schreiben über MCP/CLI gegen die NAS-API, nicht über die UI. Die UI ist ausschließlich für den menschlichen PO.

## Product Purpose

DevD ist ein Multi-Tenant Sprint-Planungs-, Backlog-Pflege- und Live-Review-Tool. Es hält den arbeitsaktuellen Zustand aller Projekte (Sprints, Issues, Milestones, Reviews, Abhängigkeiten, Memories, SSTDs) in einer zentralen SQLite-DB und ist die Steuerzentrale für einen KI-gestützten Entwicklungs-Workflow: der PO refined Issues und plant Sprints, KI-Agenten setzen um, der PO reviewt das Ergebnis im selben Tool.

Erfolg heißt: der PO behält über viele parallele Projekte hinweg den Überblick und kann jede Lifecycle-Aktion (Issue erfassen, refinen, Sprint starten, reviewen) ohne Reibung ausführen — am Desktop dicht und tastaturgetrieben, am Handy schnell und einhändig.

## Information Architecture

Die Oberfläche ist in **drei Scopes** gegliedert (Quelle der Wahrheit für Screens/IA:
`specs/31-Documentation/Storybook - GF2 Requirements (Perspektiven-Jobs-Organismen).md`
+ das Glossar `Storybook-GF2-Requirements-UserInput.md`; PRODUCT.md trägt nur die
Strategie, nicht das vollständige Inventar):

- **Global (projektübergreifend):** DevDashHome (Projekt-Übersicht), GlobalSettings, Trash (gelöschte Entitäten wiederherstellen), EntityList (projektübergreifende Listen), GlobalIssueCapture.
- **Project-Main (projekt-scoped):** ProjectHome (Kommandozentrale), RoadmapBoard, Backlog, ProjectMemory, ProjectSettings, ProjectTags, SstdPage, SopPage, SprintBoard, ProjectIssueCapture. Jeder Main-Screen hat einen Shortcut (h/r/b/m/s/t/…).
- **Detail:** MilestoneDetails, SprintDetails, IssueDetails (ein gemeinsames, entity-parametrisiertes Detail-Skelett), ReviewPage (separat: Verdict-Flow + Live-Log).
- **Cross-Cutting (kein Screen):** AppShell (Rahmen), QuickSwitcher (Projekt-Schnellwahl, `q`), CommandPalette (`cmd/strg+p`).

Das Komponenten-Modell ist atomic-design-basiert (Atome → Moleküle → Organismen →
Templates → Screens), aufgebaut als Storybook-Insel (`src/storybook/`). Wiederkehrende
Muster sind **konsolidiert statt dupliziert**: eine `ListView`-Familie trägt
Backlog/EntityList/Trash/Tag-Ergebnisse; ein `EntityItem` (card/row) und ein
`EntityDetail`-Skelett tragen alle Entitäten. Das Organismus-Inventar ist
**requirements-first** aus den Jobs abgeleitet (nicht aus dem Status quo).

## Brand Personality

Präzise, dicht, keyboard-first. Ein Power-Tool für einen Power-User, kein Onboarding-Produkt für Einsteiger. Tonfall: sachlich, technisch ehrlich, ohne Marketing-Glätte. Es zeigt den Maschinenraum (Issue-Keys, Status-Pipeline, Audit-Log) statt ihn zu verstecken. Emotionales Ziel: Kontrolle und Vertrauen — der PO soll spüren, dass das Tool den wahren Systemzustand zeigt und jede Aktion vorhersehbar ist. Vorbilder im Geist: Linear (Dichte + Tastatur), Raycast (Geschwindigkeit), Stripe-Dashboard (lesbare Datentiefe).

## Anti-references

- **Jira / Azure DevOps-Schwere**: keine überladenen Toolbars, keine Modal-Ketten, keine tiefen Menübäume, keine träge Navigation. Aktionen sind direkt erreichbar, nicht drei Klicks tief vergraben.
- **Consumer-Verspieltheit**: keine Maskottchen, keine Bounce-/Elastic-Animationen, keine übergroßen Illustrationen, keine Gamification. Bewegung ist funktional (Slide-in eines Drawers), nicht dekorativ.
- **Generisches SaaS**: keine identischen Card-Grids, keine Hero-Metric-Kacheln (große Zahl + kleines Label + Gradient), keine Purple-Pink-Gradients, keine Emoji als UI-Icons. Icons kommen aus Lucide (kuratiertes Registry, Farbe an Semantik-Rolle), nicht aus dem Emoji-Zeichensatz.

## Design Principles

1. **Dogfooding-Disziplin** — DevD befolgt selbst die Konventionen, die es als Tool durchsetzt. Wenn das Tool Status-Disziplin verlangt, lebt seine eigene UI Status-Disziplin vor.
2. **Dichte vor Dekoration** — der Bildschirm dient einem Experten, der viel auf einmal sehen will. Informationsdichte schlägt großzügige Leere; Whitespace strukturiert, statt zu füllen.
3. **Tastatur ist primär, Maus ist optional** — jede häufige Aktion hat einen Shortcut; sichtbarer Focus-Ring ist Pflicht, nicht Beiwerk.
4. **CLI/UI-Parität** — was die UI kann, kann auch CLI/MCP, und umgekehrt. Die UI erfindet keine eigene Wahrheit; Master ist die DB.
5. **Status ist Wahrheit** — Lifecycle, Review-Verdict und Abhängigkeiten sind immer transparent sichtbar, nie hinter Optimismus versteckt. Ein abgelehntes Review sieht abgelehnt aus.
6. **Konsolidieren statt duplizieren** — wiederkehrende Muster (Listen, Entity-Items, Detail-Ansichten, Such-/Capture-Formulare) sind eine parametrisierte Komponente, nicht n Kopien. Reduziert Drift und Review-Last.

## Responsive & Geräte

Die ursprüngliche Vision umfasst Desktop, Tablet (Hoch/Quer) und Mobil (Hoch/Quer).
Für die laufende Frontend-Rebuild-Phase (GF-2 Phase 2) gilt eine bewusste Eingrenzung
(PO 2026-06-16, Decisions D09/D10):

- **Desktop ist Baseline + alleiniger Build-Fokus der Phase 2.** Mobile/Tablet-Screens, der mobile Capture-Touch-Feinschliff, FAB (radial) und Touch-Drag sind **zurückgestellt** in eine spätere Responsive-Phase — nicht abgeschafft.
- **Responsive ist eine Viewport-/Container-Eigenschaft, kein eigener Tier und keine Geräte-Komponenten.** Layout reagiert auf verfügbaren Platz (Container-Queries), nicht auf Geräte-Identität.
- **Mobile-Readiness wird trotzdem jetzt verankert** (Anti-Retrofit-Drift): intrinsisch responsive Layout-Primitive, Container-Queries, fluide Größen (keine fixen px-Breiten), Touch-Targets (44×44) + 16px-Inputs in den Atomen, keine hover-only-Affordanzen, Aktionen als Daten (damit eine spätere FAB-Präsentation Config statt Rewrite ist), und ein dokumentierter Reflow-Vertrag in der MDX jeder Layout-Organismus-Story.

## Accessibility & Inclusion

Ziel: WCAG 2.2 AA mit explizitem Keyboard-First-Anspruch.

- Kontrast mindestens AA; Text-Selektion im Dark Mode bereits >10:1 (Lavender auf Crust).
- Sichtbarer Focus-Indikator durchgängig (uniformer Lavender-Ring via `:focus-visible`, token-gebunden).
- Vollständige Tastatur-Navigation für alle Kern-Workflows (Board, Backlog, Review); jede Aktion ist auch ohne Hover erreichbar.
- `prefers-reduced-motion` respektieren: zentraler Block reduziert Durations und schaltet Press-/Keyframe-Animationen ab (WCAG 2.3.3).
- Touch-Targets mindestens 44×44px, Inputs 16px Schriftgröße — bereits in den Atomen verankert (gegen iOS-Auto-Zoom + für den späteren mobilen Pfad).
- Light (Catppuccin Latte, Default) und Dark (Catppuccin Macchiato) sind gleichwertig gepflegt, nicht eines als Nachgedanke.
