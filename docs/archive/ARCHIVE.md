---
title: ARCHIVE — Decommission-Protokoll DevD 2.0
description: Archivierungs-Status, was abgebaut wurde, was noch lebt, wie man zurückkommt
---

# ARCHIVE — DevD 2.0 (DD2)

**Status: archiviert am 2026-07-26.** Aktive Entwicklung eingestellt. Abgelöst durch
**lean-stack** (Methodik/CLI) + **OKF Knowledge Catalogue** (Wissen) + **beans** (Work-State).
Letzter inhaltlicher Commit: 2026-07-08 (`feat(tui): multi-line description field in New-Project form`, DD2-275).

Dieses Repo ist **Referenz, keine Baustelle**. Kein Sprint-Betrieb, keine Issues, keine Reviews.
Die Regeln in `CLAUDE.md` gelten weiter für den Fall, dass doch noch am Code gearbeitet wird.

## Was beim Decommission gemacht wurde (2026-07-26)

| Bereich | Aktion |
|---|---|
| Verwaiste Worktrees | `DD-wt-review`, `DD-wt-docs`, `DD-wt-appshell`, `DD-wt-backlog-pane` (je ~2000 Dateien, Stand 2026-06-24/25, git-Metadaten bereits verloren) als `tar.gz` gesichert nach `../DeveloperDashboard_backup/worktree-archives/`, Verzeichnisse gelöscht (1,34 GB frei) |
| `docs/` | 27 uncommittete Löschungen rückgängig gemacht (`git restore`) — Doku-Basis und der KC-Symlink `~/Obsidian/Knowledge-Catalogue/devd2-okf` lesen wieder |
| Branch | `fix/dd2-42-create-issue-form` gelöscht (war vollständig in `main` gemerged) |
| MCP global | `devd-dashboard` aus `~/.claude.json` entfernt (Backup: `~/.claude.json.bak-pre-devd-decommission`) |
| MCP `home-dashboard` | `devd-dashboard` aus `.mcp.json` entfernt (Backup: `.mcp.json.bak-pre-devd-decommission`) — zeigte seit dem Clean-Cut auf den toten Pfad `mcp/devd-mcp.js` |
| MCP `myPrivateBabyTracker` | dito |
| Tag | `v2.3.0` als Abschluss-Tag, `main` + Tag nach `github.com/xRiErOS/devdash` gepusht |

## Was noch lebt — offene To-dos für Erik

Diese Punkte kann eine KI nicht erledigen (harte Regel 1: kein NAS-Zugriff):

1. **NAS-Prod-Container abschalten** — DevD läuft weiter auf der Synology unter
   `http://100.71.39.53:3001` (Portainer, gepinnter Tag). Entscheiden: abschalten oder als
   Read-only-Referenz weiterlaufen lassen.
2. **NAS-DB sichern** — die SQLite-Master-DB liegt auf der NAS, nicht in diesem Repo. Vor dem
   Abschalten ein Dump ziehen, sonst ist die gesamte Issue-/Sprint-Historie aller Projekte weg
   (mybaby/MBT, home-dashboard, DD2 selbst).
3. **Capture-PWA / `issues.familie-riedel.org`** — Cloudflare-Tunnel + Authelia-Route zeigen auf
   den DevD-Container. Bei Abschaltung mit abbauen (DD-375).
4. **GHCR-Images** — `build-image.yml` publiziert nach GHCR; alte Tags ggf. aufräumen.

## Bekannte Kopplungen (brechen, wenn das Repo verschoben wird)

- `~/Obsidian/Knowledge-Catalogue/devd2-okf` ist ein **Symlink** auf `docs/devd2-okf/` in diesem
  Repo. Wird das Repo verschoben oder gelöscht, ist das OKF-Bundle `devd2-okf` tot. Vor einem
  Umzug: Bundle physisch in die Knowledge-Catalogue kopieren und den Symlink ersetzen.
- `~/.claude.json` → `githubRepoPaths` enthält zwei Einträge, die auf diesen Pfad zeigen
  (`xrieros/developerdashboard`, `xrieros/devdash`). Harmlose Metadaten, aber bei einem Umzug stale.
- `../DeveloperDashboard_backup/` (1,1 GB) hält den Pre-Clean-Cut-Stand inkl. der alten Doku-Basis
  (`specs-DD/`, PRD/FSD/C4, RPDs, Mockups) sowie jetzt die Worktree-Tarballs.

## Wiederherstellung

```bash
# Worktree-Stand von 2026-06-25 zurückholen
tar -xzf ../DeveloperDashboard_backup/worktree-archives/DD-wt-review-2026-06-25.tar.gz -C /tmp

# MCP-Verdrahtung zurückholen (Pfad-Korrektur nötig: mcp/ → apps/cli/mcp/)
cp ~/.claude.json.bak-pre-devd-decommission ~/.claude.json
```

Die Tarballs enthalten **kein** `node_modules`, `storybook-static`, `dist`, `playwright-report`,
`test-results` — und keine git-History (die war zum Zeitpunkt der Archivierung bereits verloren,
die `.git`-Zeiger der Worktrees waren tot).
