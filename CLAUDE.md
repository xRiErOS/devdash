# DevD 2.0 (DD2) — Projekt-Kontext für KI-Agenten

Sprint-/Backlog-/Review-Tool, Multi-Projekt, NAS-gehostet. Nach dem Clean-Cut (2026-06-25) bewusst schlank: **Backend ist solide und bleibt**, das Frontend wird aus dem **Storybook-Katalog** (= Design-Wahrheit) neu zusammengesetzt. Keine Plan-Kette, keine Drift-Gates, kein Heartbeat/SSTD-Zwang mehr.

## Harte Regeln (nicht verhandelbar)

1. **KI deployt NIE auf NAS** — Prod-Deploy ist exklusiv Erik via Portainer. Kein `ssh`, `docker compose`, `docker run`. KI-Arbeit endet mit lokalem Merge auf `main`; Deploy-Bedarf nur flaggen.
2. **Sprint-Abschluss = exklusiv PO** (DD-186) — KI setzt nie `done`/`passed`-Verdikt, schließt nie einen Sprint.
3. **Projekt-Check vor jeder Sprint-/Issue-Aktion** — DD2 ist `project_id=10` / slug `devd2` / Prefix `DD2`. Nicht mit anderen Projekten (mybaby/MBT) verwechseln. Projekt aus Key-Prefix ableiten oder nachfragen.
4. **Push nur bei neuem Version-Tag, sonst lokal** (GitHub-Billing-Sperre) — direkt auf lokal `main` committen (`git commit` ja), KEINE routinemäßigen Remote-Pushes/PRs. `git push` (Branch/`main`/Tags) ausschließlich beim Setzen eines Version-Tags `vX.Y.Z`. Ohne Tag: rein lokal, Push-Bedarf nur flaggen. Remote: `github.com/xRiErOS/devdash`.

## Frontend-Methodik — Storybook als Samen (die „Lösung")

Storybook (`src/storybook/`, kuratierte Stories) ist Design-Wahrheit **und** Bauquelle. `src/components/` hält die Bauteile, die die Stories rendern. `src/screens/_shell/` ist die dünne, handgepflegte App-Hülle (Frame/Rail/Topbar/Routing).

**Promote-Loop pro Screen (Strangler):** Prozedur (presentational Story → Connected-Wrapper + Route → TDD Logik → fertig) → [`docs/frontend-promote-loop.md`](docs/frontend-promote-loop.md).

**Alignment-Garantie (statt Drift-Gates):** Story und Prod importieren dasselbe Bauteil — eine Kopie, kann nicht driften. Tokens kommen aus `src/index.css` (Single Source). Einziges Frontend-Netz: ein Render-Smoke (alle `*.stories.*` müssen rendern).

**Design-Foundations:** `DESIGN.md` (visuell) + `PRODUCT.md` (strategisch). Token-Master ist `src/index.css` (Tailwind v4, Catppuccin) — bei Konflikt gewinnt die CSS. Lucide-Icons (kein Emoji), echte Tokens.

**Regel-Verortung (D07):** Directory-spezifische Regeln gehören in eine eigene `CLAUDE.md` im jeweiligen Verzeichnis — nur repo-weite Regeln in diese Root-Datei. Keine Doppelpflege. Frontend-Detail:
- `apps/frontend/CLAUDE.md` — Frontend-weit: Token/Stil, Komponenten-Pfad, Icon-Registry, Render-Smoke (`tests/frontend-render-smoke/`), Storybook-Setup.
- `apps/frontend/src/storybook/CLAUDE.md` — Storybook-Insel: Tier-Verortung, Story-Namens-Vokabular, `status:`-Tags, `data-ui`-Konvention, presentational-only, MDX-Norm.

## Entwicklungs-Methodik

- **TDD** für Verhalten/Logik (red→green→refactor). Reine Präsentation ausgenommen (Storybook + Augenschein). Framework: vitest (node-env, `renderToStaticMarkup`, kein jsdom).
- Recherche/abgrenzbare Arbeit an Subagenten delegieren — mit explizitem Output-Format-Vertrag.

## Stack & ENV

| Layer | Technologie |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 (Catppuccin), Storybook 10 |
| Backend | Express 5 + better-sqlite3 + WebSocket (`ws@8`) |
| DB | SQLite (NAS-Master) |

| ENV | Produktiv (NAS) | Dev-Default | Zweck |
|---|---|---|---|
| `DEVD_API_URL` | `http://100.71.39.53:3001` | `http://localhost:5556` | API-URL (aus `.mcp.json`, nie überschreiben) |
| `DEVD_DB_PATH` | NAS intern | `<repo>/data/devd.db` | SQLite-Pfad (nur lokal) |
| `CAPTURE_HOST` | `issues.familie-riedel.org` | (default) | Capture-API-Allowlist-Host (DD-375) |

Datenmodell-Wahrheit: `contracts/*.contracts.js` (Zod). Status-Maschine: `server/lib/lifecycle.js`. Status-Transitions nie per SQL — `lifecycle.js` validiert.

## Multi-Tenant

Zentrale DB, pro Projekt isolierte Sprints/Backlog/Runs (`project_id` FK). Issue-Keys `<prefix>-<n>` (z.B. `DD2-7`, `MBT-42`). Backend `currentProjectId(req)` (Header > Query > Body, Default 1).

## Sicherheit — Capture-Host Allowlist (DD-375)

Security-relevant — vor Änderungen an Hostname-Routing / `issues.*` / `server/api.js`-Middleware lesen. `issues.*` liegt hinter Authelia (family-2FA). App-Guard `server/lib/captureHostGuard.js`: auf `CAPTURE_HOST` nur `GET /api/projects/by-slug/:slug/capture` + `POST /api/issues`, sonst 403. **Bei neuem Capture-PWA-API-Call: `CAPTURE_API_ALLOWLIST` erweitern.** Tests: `tests/dd375-capture-host-guard/` + `tests/dd392-public-capture/`.

## Deployment-Kontext

Produktiv auf NAS (Synology), NICHT lokal. KI-Agenten/MCP/CLI gegen `http://100.71.39.53:3001` (Tailscale). NAS-DB = Master. Prod = gepinnter Tag `vX.Y.Z` (Portainer ← `build-image.yml` → GHCR); Deploy exklusiv Erik.

## Doku-Index

Wichtige Projektdateien hier eintragen. Neue zentrale Doku-Dateien → Zeile ergänzen.

| Trigger-Words | File Location | Summary |
|---------------|--------------|---------|
| Design, Farben, Tokens, Catppuccin, Layout, UX, Typografie | `docs/DESIGN.md` | Visuelles Design-System: Farbschema (Catppuccin Latte/Macchiato), Token-Hierarchie, Layer-System, Spacing, Typografie, UX-Guidelines |
| Produkt, Vision, Stack, Features, Roadmap, Architektur, Scope | `docs/PRODUCT.md` | Strategische Produkt-Referenz: Value Proposition, Kernfunktionen, Technologie-Stack, Datenmodell, Architektur-Prinzipien |
| data-ui, Attribut, Storybook-Anker, Namensschema | `apps/frontend/src/storybook/CLAUDE.md` | `data-ui`-Konvention (Punkt-Schema, PO-Ansprechkanal) — Konvention, KEIN Gate (Clean-Cut D02) |
| mdx, Story-Doku, Norm, Template, Sektionen, Status | `docs/doc-mdx-Norm.md` | Pflicht-Norm für `.mdx`-Dateien je Story: Pflicht-Sektionen, bedingte Sektionen, Screen-Erweiterung; Template: `docs/doc-mdx-Norm-Template.mdx` |
| Storybook, Tailscale, Remote, ThinkPad, allowedHosts, 0.0.0.0, 6006 | `docs/storybook-tailscale.md` | Storybook vom Mac über Tailscale am ThinkPad ansehen: `npm run storybook:remote` (`-h 0.0.0.0`), allowedHosts-Hintergrund, Troubleshooting |
| ToolHome, Projektauswahl, /home, ProjectCard, AddProjectCard, Lobby | `docs/ToolHome-Spec.md` | Screen-Spec: globaler Einstiegspunkt, Projektauswahl-Grid, Komponentenbaum, Stories, Entscheidungen D01–D08 |
| TUI, Detail-Edit, Fokus, Feld-Edit, Accordion, Meilenstein/Sprint/Issue editieren, DD2#12-14, Guardrails | `apps/cli-go/tui-plan.md` | **PFLICHT-READ** für TUI-Detail-Edit (Sprints DD2#12/13/14): Ziel, Spirit, Decisions D01–D10, editierbares Feld-Set, Sprint-Schnitt, Out-of-Scope |
| TUI, Build, Install, go shadow, command go, bin/dd, devd-cli, dd-tui, Worktree-Build, stale Binary, Codegen, go:generate, Freshness-Gate, Coverage-Check, skip-allowlist, agent-only | `docs/cli-go-build.md` | Verlässliche Build/Install-Anleitung Go-TUI (`apps/cli-go`): `command go build/install`, `go`-Shadow-Falle, Verifikation, Worktree-Hinweis, Codegen-Workflow (D07 Freshness-/Coverage-Gate) |
| SSTD, Session State Transfer, Session-Übergabe, DD2#37, Freshness-Gate, Coverage-Check, GLOSSARY.md-Reshape | `docs/SSTD.md` | Session State Transfer Document (CODE): DD2#37-Delta (Freshness-/Coverage-Gate), offene Punkte, Next Actions, Fund zum parallelen GLOSSARY.md-Reshape |
| MCP-Notes, Tool-Notes, devd-MCP Export, Vault-Notes generieren, gen-mcp-notes, MCP-Dokumentation | `scripts/gen-mcp-notes.mjs` | Generiert pro MCP-Tool eine Obsidian-Note (Frontmatter + Flags-Tabelle) + Index nach Vault `DD-PO-Lokal/devd-MCP`. Re-runnbar: `node scripts/gen-mcp-notes.mjs`. Tool-Count-Guard anpassen bei MCP-Änderungen. |
| Sprint durchführen, run-sprint, Sprint bearbeiten, Sprint-Layer, Ports, Git-Policy | `docs/sprint-project-layer.md` | Projekt-spezifischer Layer für `/run-sprint`: Identität (DD2/devd2/10), Git-Policy, Ports/Build, Promote/Build-Zeiger, Abschluss-Grenze |
| Promote-Loop, Screen bauen, Storybook-Samen, Connected-Wrapper, Strangler | `docs/frontend-promote-loop.md` | Promote-Loop pro Screen (Tier 4): presentational Story → Connected-Wrapper + Route → TDD Logik → fertig, kein Gate |
| CONTEXT.md, CONTEXT-MAP, Glossar, Begriffe, ubiquitous language, Bounded Context, Surface-Glossar | `CONTEXT-MAP.md` | Wurzel des Glossar-Netzes: verweist je Surface auf `CONTEXT.md` (Begriffe impl-frei); Wurzel-`CONTEXT.md` = übergreifende Begriffe (Issue/Sprint/Meilenstein/User-Story) |
| domain-modeling, Begriff schärfen, Glossar pflegen, Term-Konflikt, ubiquitous language | `~/.claude/skills/domain-modeling/SKILL.md` | model-invoked Glossar-Pfleger: fordert Begriffe heraus, präzisiert, prüft gegen Code, schreibt `CONTEXT.md` fort |
| Hilfsskript, Script, gibt es schon ein Script, scripts/, Utility ausführen | `scripts/INDEX.md` | Generierte Manifest-Tabelle aller `scripts/` (Titel/Beschreibung/Pfad). Vor Neubau eines Helfers hier prüfen. Pflege via `@index`-Block + `npm run gen:index -- scripts` (Guard: `gen:index:check`) |

## Doku-Archiv

Die alte Doku-Basis (`specs-DD/`, PRD/FSD/C4, RPDs, Mockups, Agent-Context) liegt **außerhalb** dieses Repos im Status-Quo-Archiv (`../DeveloperDashboard_backup/`). PO zieht bei Bedarf daraus — sie ist Referenz, nicht erzwungene Kette.

<!-- context-model:base-rules v1 — managed, nicht hand-editieren; via /context-model aktualisieren -->
### Context-Model — Grundregeln (managed)

Diese Regeln halten die Wissens-Architektur driftfest. Sie sind Invarianten, kein Ablauf.

- **CLAUDE.md = Invariant + Router.** Nur unumstößliche Regeln und Trigger→Fundstelle-Zeiger. Keine Prozedur, kein Schritt-für-Schritt-Ablauf — der gehört in einen Skill oder nach `docs/`.
- **Single Source of Truth.** Genau eine autoritative Heimat je Wissensstück. Kein Fakt an zwei Orten pflegen.
- **Glossar = nur Begriffe.** `CONTEXT.md` definiert Begriffe, niemals Pfade/Locations (die wandern bei Refactors). Locations → Router; Decisions → Wissensbasis.
- **Churn-gerecht platzieren.** Häufig Änderndes wo Änderung billig ist (Router, `docs/`); Stabiles wo Stabilität zählt (Glossar, Invarianten).
- **Generierte Dateien nie von Hand editieren.** Jede generierte Datei (z.B. `INDEX.md`) hat einen `--check`-Drift-Guard; Änderung nur über den Generator.
- **Enumerierbare Buckets bekommen eine generierte `INDEX.md`** (`title | description | path`), auffindbar über eine Router-Zeile in dieser Datei — kein Auto-Load, keine Hand-Liste.
- **Gedächtnis-Schichtung.** Decisions/Patterns/Lessons in die abfragbare Wissensbasis (nicht am Issue vergraben); git history ist das chronologische Gedächtnis (ein Commit je Issue mit Key). Kein Parallel-Journal.
- **Nur Router + CONTEXT-MAP zeigen quer** über Schichten. Ein Leaf-Dokument referenziert nie eine ferne Nicht-Nachbarschicht.
<!-- /context-model:base-rules -->
