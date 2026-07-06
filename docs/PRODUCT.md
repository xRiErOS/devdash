---
type:
description: "Strategische Produkt-Referenz: Value Proposition, Kernfunktionen, Stack, Datenmodell, Architektur-Prinzipien"
tags: []
aliases: []
relates_to:
uid: 00f26419-cb5f-41d9-b016-c279c8bf3b55
title: Produkt-Referenz
---

# PRODUCT.md — Developer Dashboard (DevD)

## 1. Metadata & Status

| Feld | Wert |
|------|------|
| Produktname | Developer Dashboard (DevD) |
| Projektstatus | In Produktion (GF-2 Frontend-Rebuild aktiv — Strangler-Promote-Loop) |
| Zuletzt aktualisiert | 2026-06-25 |
| Zielplattform | Web (PWA), Self-Hosted (NAS) |

---

## 2. Vision & Problemstellung

### Problem

Entwickler, die gleichzeitig Product Owner ihrer eigenen Projekte sind, brauchen ein Werkzeug, das Sprint-Planung, Backlog-Pflege und KI-Agenten-Kollaboration in einer einzigen Oberfläche zusammenbringt. Bestehende Tools (GitHub Projects, Linear, Jira) sind entweder zu schwergewichtig, nicht AI-native oder erzwingen ein Workflow-Modell, das nicht zu autonomen Entwicklungs-Sessions passt.

### Zielgruppe

**Power-User PO** — ein Entwickler, der alle Rollen trägt: Produktverantwortung, Architektur, Implementierung, und Steuerung von KI-Agenten. Keyboard-first, terminal-affin, gewohnt präzise Informationen auf einen Blick zu lesen.

### Value Proposition

DevD ist das Sprint-Cockpit für den solo Entwickler mit KI-Kollaboration:

- Vollständiger Sprint-Lifecycle (Plan → Review → Done) ohne Tool-Wechsel
- Backlog als Eingangskanal mit Refinement-Workflow (Idee → implementationsreif)
- MCP-Server + CLI als KI-Gateway: Agenten lesen, schreiben und steuern das Dashboard programmatisch
- SSTD (Session State Transfer Document) für nahtlose Kontext-Kontinuität zwischen KI-Sessions
- Multi-Tenant: mehrere Projekte parallel unter einer Instanz

---

## 3. Kernfunktionen & Scope

### In Scope

| Feature | Beschreibung |
|---------|-------------|
| Sprint Board | Aktiver Sprint mit Issue-Liste, Status-Transitions, Capacity-Tracking |
| Sprint Review | Strukturierter Review-Prozess je Issue (passed/not_passed/deferred), Abschluss-Flow |
| Backlog | Eingangskanal: Ideen erfassen, Refinement-Felder ausfüllen, Sprint zuweisen |
| Roadmap Board | Meilensteine als Spalten, Sprints als Cards, Drag & Drop Reorder |
| Project Home | Tab-basierte Schaltzentrale: Overview, Backlog, Roadmap, SSTD, Memories |
| Project Memories | Projekt-scoped semantisches Gedächtnis (architecture_decision, bug_pattern, convention …) |
| SSTD | Slot-basiertes Session-State-Dokument für KI-Kontext-Recovery |
| SOPs | Standard Operating Procedures, proj-scoped, abrufbar via MCP; Collections für Bundles |
| Session Notes | Gesprächsnotizen pro KI-Session, proj-scoped |
| User Stories | Akzeptanzkriterien je Issue, Verdict-Workflow |
| Capture PWA | Minimale öffentliche Shell für schnelle Issue-Erfassung von unterwegs |
| MCP Server | stdio-Gateway für KI-Agenten (`devd_*`-Tools) |
| CLI | Shell-Gateway für Automation (`devd-cli`) |
| Settings | Globale + per-Projekt-Einstellungen, Theme-Toggle |
| Storybook | Komponentenkatalog (Atomic Design, 8 Layer) + Design-Wahrheit |

### Out of Scope

- KI-Deployment: Agenten deployten nie selbst in Produktion — ausschließlich PO-Aktion
- Echtzeit-Kollaboration (kein Multi-User-Simultanbetrieb)
- Notifications / E-Mail / Kalenderintegration
- Externe Issue-Tracker-Synchronisation (kein GitHub/Jira-Sync)
- Generative KI innerhalb der App-UI (KI bleibt außerhalb als MCP-Client)

### Roadmap (High-Level)

| Phase | Schwerpunkt |
|-------|------------|
| M0 (abgeschlossen) | Kern-CRUD: Issues, Sprints, Reviews, Backlog |
| M1 (abgeschlossen) | Roadmap Board, Milestones, Project Memories, Capture-PWA |
| M2 (aktiv) | Project Home (Tab-Shell), AppShell-Refactor (GF-2 Storybook-Rebuild) |
| M3+ | Mobile-Track, ProjectPages (SOPs/Widgets), Sprint-Review-V2 |

---

## 4. Technische Architektur & Stack

### Technologie-Stack

| Layer | Technologie | Version |
|-------|-------------|---------|
| Frontend | React, Vite, Tailwind CSS (Catppuccin), react-router-dom | React 19.2, Vite 8, Tailwind 4.2, RR 7.18 |
| State/Drag | @dnd-kit (core/sortable/utilities), kein Redux | dnd-kit 6/10 |
| Editor | @uiw/react-codemirror + @retronav/ixora (CM6, Catppuccin, Live-Preview) | CM 6 |
| Icons | lucide-react | 1.11 |
| PWA | vite-plugin-pwa (Service Worker, autoUpdate) | 1.3 |
| Backend | Express 5 + better-sqlite3 (sync API) + WebSocket (`ws`) | Express 5.2 |
| DB | SQLite (WAL) + sqlite-vec (Vektor-Suche für Memories) | sqlite-vec 0.1.9 |
| Shared Types | `packages/api-types` (Zod-Contracts + Key-Parsing) | Zod 4 |
| CLI | `apps/cli/bin/devd-cli.js`, eigenes Command-Routing | — |
| MCP | `@modelcontextprotocol/sdk`, stdio | SDK 1.29 |
| Storybook | @storybook/react-vite | SB 10.4 |
| Tests | Vitest (node-env), Playwright | Vitest 4.1 |
| Build/Deploy | Docker (multi-stage) → Container Registry | linux/amd64 |

### Monorepo-Struktur

```
apps/
  backend/     Express 5 API + SQLite + WebSocket
  cli/         devd-cli + devd-mcp (stdio)
  frontend/    React 19 SPA + Storybook
packages/
  api-types/   Zod-Contracts + Key-Parsing (shared)
```

### Systemgrenzen & Integrationen

- **3 Gateways, 1 Datenbank:** REST API (`apps/backend/src/api.js`), CLI (`apps/cli/bin/devd-cli.js`), MCP Server (`apps/cli/mcp/devd-mcp.js`) — alle auf dieselbe SQLite-DB.
- **Multi-Tenant:** Alle Entitäten tragen `project_id`. Header `X-Project-Id` steuert den REST-Scope.
- **Capture-Host:** Eigene minimale PWA-Shell auf separater Domain (hinter Authelia/2FA). API-Allowlist beschränkt auf Issue-Create + Projects-List (`captureHostGuard.js`).
- **KI-Agenten-Zugang:** Via MCP (Standard in Claude-Code-Sessions) oder CLI (Shell-Automation). Kein direkter DB-Zugriff von außen.

### Datenmodell (Kerntabellen)

```
projects         (id, slug, name, prefix, color, archived)
sprints          (id, project_id, name, status, capacity, position)
backlog          (id, project_id, project_number, title, type, status, priority,
                  milestone, goal, background, context_notes, relevant_files, assigned_sprint)
tasks            (id, sprint_id, backlog_id, status)
review_feedback  (id, backlog_id, round_number, review_status, notes, comment)
user_stories     (id, backlog_id, text, verdict)
project_sstd_slots
project_memories (id, project_id, type, title, body, tags)
memory_tags      (Register für Memory-Tag-Typen)
sops             (id, project_id, title, body)
sop_collections  (id, project_id, name; pivot: sop_collection_items)
session_notes    (id, project_id, title, body, created_at)
audit_log
```

Issue-Keys: `<PREFIX>-<project_number>` (z.B. `DD2-7`). Sprint-Keys: `<PREFIX>#<number>` (z.B. `DD#49`).

### Architektur-Prinzipien

- **Storybook-als-Samen (Strangler-Promote-Loop):** Jeder Screen entsteht zuerst als presentational Story (Daten via Props/MSW). Dann Promote: dünner Connected-Wrapper holt echte Daten, Route in `screens/_shell/routes.jsx` auf Screen biegen. Story und Prod importieren dasselbe Bauteil — eine Kopie, keine Drift möglich.
- **Contract-Wahrheit:** `packages/api-types/*.contracts.js` (Zod) ist Single Source für Datenstrukturen. Status-Transitions ausschließlich über `apps/backend/src/lib/lifecycle.js` — nie per Raw-SQL.
- **Token-Master:** `apps/frontend/src/index.css` (Tailwind v4, Catppuccin Latte/Macchiato). Bei Konflikt gewinnt die CSS.
- **Kein Drift-Gate:** Kein Heartbeat-Checker, kein C4-YAML, keine PRD→FSD-Kette. Einziges Frontend-Netz: Render-Smoke (alle `*.stories.*` müssen rendern).

---

## 5. Design & UX-Prinzipien

### Design-System

- **Farbschema:** Catppuccin — Latte (Light) / Macchiato (Dark). Theme-Toggle via `html[data-theme]`.
- **Token-Master:** `apps/frontend/src/index.css`. Zwei Schichten:
  - Catppuccin-Rohfarben (nur Tags, Priority, Status-Borders direkt)
  - Semantische Tokens (Pflicht für neue Komponenten): `--accent-primary` (peach), `--accent-success` (green), `--accent-danger` (red), `--accent-warning` (yellow), `--accent-info` (sapphire)
- **Typografie:** JetBrains Mono als Display-Font — unterstreicht den Terminal-Charakter.
- **Spacing:** 4px-Grid, `--space-*`-Tokens.
- **Elevation:** 6-Ebenen-Leiter `--layer-*`; Tiefe primär über Surface-Stufe (`crust < mantle < base`) + Border, nicht Schatten.
- **Icons:** lucide-react ausschließlich — keine Emojis in der UI.

### Layout

- **App-Shell:** 3-Spalten (Rail | Main Content | Detail/Panel) — kollabierbare Sidebar.
- **Rail-Icons:** Tool-Home / Projekt-Home / Roadmap / Backlog / Memories + Fuß (Settings, AI-Cost, Trash).
- **Responsive:** Mobile-First-Grid, `useViewportMode`-Hook, Touch-Targets ≥44px, `font-size:16px` auf Inputs (iOS-Zoom-Schutz).

### UX-Guidelines

- **Keyboard-first:** Shortcuts für alle Hauptnavigationen (z.B. `h` = Project Home).
- **Terminal-Ästhetik:** Monospace-Display, reduzierte Farben, dichte Informationsdarstellung ohne Dekoration.
- **Status-Farben (konsistent app-weit):** peach=pending, green=passed/done, red=rejected, blue=info/refined, mauve=to_review.

### Methodische Constraints für KI-Agenten

- **TDD:** Verhaltens-/Logikänderung beginnt mit fehlschlagendem Test (red → green → refactor). Framework: vitest (node-env, `renderToStaticMarkup`, kein jsdom). Reine Präsentation ausgenommen — Storybook + Augenschein.
- **Storybook:** Präsentation per Augenschein — kein automatisiertes Gate, kein Snapshot-Zwang.
- **PO-exklusive Aktionen:** Sprints starten/abschließen, Milestones setzen, Deploy — werden nie autonom von Agenten ausgeführt.
- **Deploy:** Exklusiv PO via Portainer. Kein `ssh`, `docker compose`, `docker run` durch KI-Agenten.
