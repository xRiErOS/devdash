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

## Worktree-Hinweis

Bei paralleler Arbeit im Worktree wird der main-HEAD nicht angefasst. Der Build läuft
aus dem Worktree-Verzeichnis; `command go install .` installiert global aus dem aktuell
ausgecheckten Stand. Vor dem Install also sicherstellen, im richtigen Worktree/Branch
zu sein (`git branch --show-current`).
