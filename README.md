# DevD 2.0 (DD2) — Developer Dashboard

Sprint-Planung, Backlog-Pflege und Live-Review-Tool. Multi-Projekt, NAS-gehostet.

Stand **2026-06-25 (Clean-Cut):** Backend bleibt solide; das Frontend wird aus dem
**Storybook-Katalog** (= Design-Wahrheit) neu zusammengesetzt. Die alte
Prozess-Maschinerie (Plan-Kette PRD→FSD→C4, Drift-Gates, AOS-Heartbeat) ist
entfernt. Arbeitsregeln + Methodik: siehe [`CLAUDE.md`](CLAUDE.md).

## Quick-Start (lokal)

```sh
npm install            # einmalig
npm run dev            # Express-API + Vite
npm run storybook      # Design-Katalog (der Samen)
npm test               # vitest (Backend + Migration + Security)
```

## Frontend-Modell — Storybook als Samen

- `src/storybook/` — kuratierte Stories = Design-Wahrheit + Bauquelle
- `src/components/` — Bauteile, die die Stories rendern (Atoms → Organisms)
- `src/screens/_shell/` — dünne, handgepflegte App-Hülle (Frame/Rail/Topbar/Routing)
- `src/index.css` — Token-Master (Tailwind 4, Catppuccin)

**Promote-Loop:** Screen presentational in Storybook bauen → dünner Connected-Wrapper
(`src/lib`-Fetch → Props) → Route in `src/screens/_shell/routes.jsx` vom Platzhalter
auf den Screen biegen. Kein Gate dazwischen. Details in [`CLAUDE.md`](CLAUDE.md).

## Stack

- **Frontend:** React 19 + Vite 8 + Tailwind 4 (Catppuccin) + Storybook 10
- **Backend:** Express 5 + better-sqlite3 + WebSocket (`ws@8`)
- **DB:** SQLite (NAS-Master), Multi-Tenant (`project_id`)

```sh
node scripts/migrate.js   # Migrationen anwenden (idempotent)
```

## Doku-Archiv

Die vollständige Alt-Doku (`specs-DD/`, PRD/FSD/C4, RPDs, Mockups, Agent-Context)
liegt **außerhalb** dieses Repos im Status-Quo-Archiv (`../DeveloperDashboard_backup/`).
Referenz, keine erzwungene Kette.

## Remote

`github.com/xRiErOS/devdash` — Push nur bei Version-Tag `vX.Y.Z` (Billing-Sperre),
sonst lokal auf `main`. Prod-Deploy exklusiv via Portainer (Erik).
