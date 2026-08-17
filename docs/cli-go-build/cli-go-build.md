---
type:
description: "Build/Install-Anleitung Go-TUI: command go build/install, go-Shadow-Falle, Verifikation, Worktree-Hinweis"
tags: []
aliases: []
relates_to:
uid: c041230e-b13f-4963-8c4a-619ec4986cbb
title: cli-go Build/Install
---

# cli-go (TUI) — Build & Install

Verlässliche Build-Anleitung für die Go-CLI/TUI (`apps/cli-go`, Modul `devd-cli`).

Gilt 1:1 im Haupt-Repo **und** in jedem Worktree — nur das Arbeitsverzeichnis wechselt.

## Kernfalle: `go` ist geshadowed

`go` ist in der interaktiven Shell als Funktion auf einen **Fake** umgebogen

(siehe `apps/cli-go/CLAUDE.md`). Darum:

- **IMMER `command go …`** (oder absolut `/opt/homebrew/bin/go …`), nie bare `go`.
- **`make build` meiden** — das Makefile ruft bare `go` auf. In Subshells greift
  die Funktion zwar nicht zwingend, aber verlassen sollte man sich nicht darauf.
  Stattdessen die expliziten `command go`-Befehle unten.

## Build (aus dem Worktree oder Repo)

```sh
cd <repo-oder-worktree>/apps/cli-go

# 1) Lokales Binary (Smoke/CI) → bin/dd
command go build -o bin/dd .

# 2) Cockpit-Install → ~/go/bin/devd-cli (Alias: dd-tui)
command go install .
```

Nach JEDER Code-Änderung neu `command go install .` — sonst startet das Cockpit

ein **stale Binary** (war B01-Fehldiagnose-Quelle).

## Verifizieren (nicht-interaktiv)

```sh
./bin/dd --help          # Cobra-Hilfe, ohne TUI zu starten
command go vet ./...
command go test ./...     # Hybrid-Tests (State + Golden + TrueColor-Guard)
```

Golden aktualisieren (nach bewusster Render-Änderung):

```sh
command go test ./internal/tui/ -run TestGolden -update-golden
```

## TUI starten

> **Konvention:** Start-/Run-Kommandos IMMER in **4-Backtick-Fence** (```` ```` ````)
> ausgeben — sonst greift `/copy` bei verschachtelten Code-Spans daneben.

````sh
./bin/dd tui          # aus dem Worktree gebautes Binary
# oder global nach install:
devd-cli              # bzw. Alias dd-tui (ohne Subcommand → TUI)
````

Die TUI spricht das DD2-Backend über `DEVD_API_URL` (Default `http://localhost:5556`,

Prod NAS `http://100.71.39.53:3001` via Tailscale). Dunkles Theme ist hart erzwungen

(`lipgloss.SetHasDarkBackground(true)`) — über ssh+tmux sonst heller BG (OSC-11-Fehldetektion).

## Codegen-Workflow (DD2-211/212/213, D07)

Der Go-Client (`internal/api/generated.go` + `internal/api/generated/generated_types.go`
+ `internal/api/generated/capabilities.json`) ist **generiert**, nicht handgeschrieben —
Quelle ist `apps/cli/mcp/devd-mcp.js` (MCP-Tool-Definitionen). Nicht von Hand editieren,
Diff wird beim nächsten Regen überschrieben.

### Neu generieren

```sh
npm run gen:cli-client
```

Führt in fixer Reihenfolge aus: `capabilities.mjs` (Soll-Dump) → `gen-types.mjs`
(Arg-Structs) → `gen-client.mjs` (Client-Funcs) → `gen-skip-allowlist.mjs`
(Skip-/Allowlist-Persistenz). Alternativ direkt aus `internal/api`:

```sh
cd apps/cli-go/internal/api && command go generate ./...
```

(`//go:generate`-Direktive in `client.go` ruft denselben npm-Script.)

### Freshness-Gate (D07)

CI (`.github/workflows/codegen-freshness.yml`) regeneriert bei jedem Push/PR und
prüft `git diff --exit-code` über `generated.go`, `generated_types.go`,
`capabilities.json`, `skip-allowlist.json`. Nicht-leerer Diff → CI rot. Das bedeutet:
**wer ein MCP-Tool ändert (devd-mcp.js), muss `npm run gen:cli-client` laufen lassen
und die geänderten Generated-Dateien mitcommitten** — sonst bricht der nächste
CI-Lauf. Lokal vor Commit denselben Befehl laufen lassen und `git status` auf die vier
Dateien prüfen.

### Coverage-Check (L1 = 100%)

```sh
npm run gen:cli-coverage-check
```

Beweist unabhängig (parst `generated.go` direkt, ruft die Codegen-Skip-Logik nicht
erneut auf): jedes Tool aus `capabilities.json` ist entweder generiert, im
Skip-Allowlist (`apps/cli-go/codegen/skip-allowlist.json` — bereits hand-implementiert,
Konsolidierung DD2#36) oder explizit `agent-only` (`apps/cli-go/codegen/agent-only-allowlist.json`
— bewusst nicht im Go-Client, z.B. reine AI-Memory-/Session-Tools ohne TUI-Bezug).
Meldet `GAP`/`OVERLAP`/`STALE` getrennt und schlägt fehl, sobald ein Tool durchs Raster
fällt. `skip-allowlist.json` und `agent-only-allowlist.json` sind beide **generiert bzw.
kuratiert, nicht frei editierbar** — Skip-Allowlist über `gen-skip-allowlist.mjs`
(Teil von `gen:cli-client`), Agent-Only-Liste von Hand pflegen, wenn ein Tool bewusst
nie einen Go-Client-Func bekommen soll.

### Neues Tool bewusst nicht im Client (agent-only)

Tool soll nur vom AI-Agenten via MCP genutzt werden, nie über TUI/CLI? Eintrag in
`apps/cli-go/codegen/agent-only-allowlist.json` ergänzen (`{"tool": "devd_...",
"reason": "..."}`), sonst meldet der Coverage-Check eine Lücke.

## Worktree-Hinweis

Bei paralleler Arbeit im Worktree wird der main-HEAD nicht angefasst. Der Build läuft

aus dem Worktree-Verzeichnis; `command go install .` installiert global aus dem aktuell

ausgecheckten Stand. Vor dem Install also sicherstellen, im richtigen Worktree/Branch

zu sein (`git branch --show-current`).
