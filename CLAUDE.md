# DevD 2.0 (DD2) — Projekt-Kontext für KI-Agenten

Sprint-/Backlog-/Review-Tool, Multi-Projekt, NAS-gehostet. Nach dem Clean-Cut (2026-06-25) bewusst schlank: **Backend ist solide und bleibt**, das Frontend wird aus dem **Storybook-Katalog** (= Design-Wahrheit) neu zusammengesetzt. Keine Plan-Kette, keine Drift-Gates, kein Heartbeat/SSTD-Zwang mehr.

## Harte Regeln (nicht verhandelbar)

1. **KI deployt NIE auf NAS** — Prod-Deploy ist exklusiv Erik via Portainer. Kein `ssh`, `docker compose`, `docker run`. KI-Arbeit endet mit lokalem Merge auf `main`; Deploy-Bedarf nur flaggen.
2. **Sprint-Abschluss = exklusiv PO** (DD-186) — KI setzt nie `done`/`passed`-Verdikt, schließt nie einen Sprint.
3. **Projekt-Check vor jeder Sprint-/Issue-Aktion** — DD2 ist `project_id=10` / slug `devd2` / Prefix `DD2`. Nicht mit anderen Projekten (mybaby/MBT) verwechseln. Projekt aus Key-Prefix ableiten oder nachfragen.
4. **Push nur bei neuem Version-Tag, sonst lokal** (GitHub-Billing-Sperre) — direkt auf lokal `main` committen (`git commit` ja), KEINE routinemäßigen Remote-Pushes/PRs. `git push` (Branch/`main`/Tags) ausschließlich beim Setzen eines Version-Tags `vX.Y.Z`. Ohne Tag: rein lokal, Push-Bedarf nur flaggen. Remote: `github.com/xRiErOS/devdash`.

## Frontend-Methodik — Storybook als Samen (die „Lösung")

Storybook (`src/storybook/`, kuratierte Stories) ist Design-Wahrheit **und** Bauquelle. `src/components/` hält die Bauteile, die die Stories rendern. `src/screens/_shell/` ist die dünne, handgepflegte App-Hülle (Frame/Rail/Topbar/Routing).

**Promote-Loop pro Screen (Strangler):**
1. Screen in Storybook bauen/finishen — **presentational** (Daten rein als Props, Mock via args/MSW).
2. **Promote:** dünnen Connected-Wrapper schreiben (holt echte Daten via `src/lib`, reicht Props rein) + Route in `src/screens/_shell/routes.jsx` vom Platzhalter auf den Screen biegen.
3. TDD nur für Logik/Verhalten (vitest node-env) + Wrapper-Datenfluss; Präsentation per Augenschein in Storybook.
4. Fertig — **kein** PRD/FSD/C4/Contract/Heartbeat/data-ui-Gate.

**Alignment-Garantie (statt Drift-Gates):** Story und Prod importieren dasselbe Bauteil — eine Kopie, kann nicht driften. Tokens kommen aus `src/index.css` (Single Source). Einziges Frontend-Netz: ein Render-Smoke (alle `*.stories.*` müssen rendern).

**Design-Foundations:** `DESIGN.md` (visuell) + `PRODUCT.md` (strategisch). Token-Master ist `src/index.css` (Tailwind v4, Catppuccin) — bei Konflikt gewinnt die CSS. Lucide-Icons (kein Emoji), echte Tokens.

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

## Doku-Archiv

Die alte Doku-Basis (`specs-DD/`, PRD/FSD/C4, RPDs, Mockups, Agent-Context) liegt **außerhalb** dieses Repos im Status-Quo-Archiv (`../DeveloperDashboard_backup/`). PO zieht bei Bedarf daraus — sie ist Referenz, nicht erzwungene Kette.
