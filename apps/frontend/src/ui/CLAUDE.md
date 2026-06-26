# src/ui — Co-located Komponenten + Storybook

Komponenten, Stories und MDX leben hier **nebeneinander** (kein separater storybook/-Ordner).
Token/Icons/Render-Smoke → `apps/frontend/CLAUDE.md`. Methodik → Root `CLAUDE.md`.

## Struktur

| Ordner | Inhalt |
|--------|--------|
| `foundations/` | Design-Tokens, Typografie, Farben, Ikonografie, Motion, Backend-Contract, Layout-Primitive |
| `atoms/` | Kleinste Bausteine (Button, Input, Badge, …) |
| `molecules/` | Kompositionen aus Atoms (FormField, SearchField, …) |
| `organisms/base/` | Abstrakte Kompositionen aus Molecules — Grundlage (FormShell, WidgetBase, …) |
| `organisms/complex/` | Konkrete Organismen mit klarer Rolle, MSW-Mock, direkte Screen-Verwendung |
| `screens/` | Vollständige Screen-Kompositionen mit Fake-Daten |

## Regeln

- **Pfad = Tier-Wahrheit** — kein Story-`title` überschreibt die Verortung
- Komponente + `.stories.jsx` + `.mdx` liegen im selben Ordner
- Stories presentational: Daten als Props, Mock via `args`/MSW — kein Live-Fetch, kein Store
- `status:` Tag je Story: `open` · `review` · `stable` (PO-exklusiv) · `archive`
- Kein `lucide-react`-Freeform-Import — Icon-Registry: `foundations/Icon.jsx`

## MDX

- Jede Story trägt eine co-located `.mdx` — einzige Narrativ-Wahrheit (Zweck, Wann/Wann-nicht, a11y)
- Kein abgetipptes Prop-Inventar — Props via `<ArgTypes of={…}>`, Beispiele via `<Canvas of={…}>`
- Norm + Template: `docs/doc-mdx-Norm.md`

## Komponenten-Index (KI-Tooling)

`npm run index:components` → `storybook-index.db` — SQLite-Registry aller Komponenten, automatisch aus `storybook-static/index.json` + MDX-Descriptions gebaut. FTS5-Index für Freitext-Suche. Nie hand-editieren; nach `build-storybook` neu erzeugen.

## Backend-Contract

`foundations/BackendContract.mdx` — Einstiegspunkt für Entity→Schema→Routes→Fixture-Mapping.
Fixtures: `foundations/fixtures/` — MSW-Handler + Stories importieren ausschließlich hieraus.
