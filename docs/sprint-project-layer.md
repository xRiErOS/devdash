# Sprint Project Layer — DD2

Projekt-spezifische Werte für `/run-sprint` (generische Prozedur: `~/.claude/skills/run-sprint/PROCEDURE.md`).
Interface: MCP `devd_*` / Shell-Alias `dd`.

## Identität
- Prefix `DD2` · slug `devd2` · `project_id 10`. Key-Form `DD2-<n>` / `DD2#<n>`.

## Git-Policy
- KEIN routinemäßiger `git push` — nur bei Version-Tag `vX.Y.Z` (harte Regel 7).
- Ein Commit pro Issue, Conventional Commits + `(DD2-N)`. Lokal `main`.
- Parallele Agenten: isolierter Worktree (`git worktree add … -b <type>/<id>-<slug> origin/main`).

## Build / Dev-Umgebung
- Ports: Vite-Dev `6106` (vite.config.js), API/WSS `5556` (CLAUDE.md-ENV). `npm run dev`.
- Frontend-Wahrheit = Storybook (`npm run storybook`), Augenschein. Netz = Render-Smoke.
- Doku-/Refinement-Sprints: Build-/Dev-Server-Schritte entfallen.

## Zeiger
- Promote-Loop (Frontend): `docs/doc-promote-loop.md`.
- Build/Install Go-TUI: `docs/cli-go-build.md`.
- Meilenstein-/Roadmap-State: Meilenstein-Documents via `devd_document_list`.

## Abschluss-Grenze
- KI endet bei `sprint review`. PO-Review + `sprint complete` exklusiv PO (harte Regel 2).
