# DevD Cockpit — Tastatur-Shortcuts

> Generiert aus der zentralen Keymap (`internal/tui/keymap.go`, DD2-47).
> Nicht von Hand editieren — neu erzeugen mit:
> `go test ./internal/tui/ -run TestShortcutDoc -update-golden`

Richtungskreuz: **jkli** — `i`=hoch, `j`=links/zurück, `k`=runter, `l`=rechts/rein (DD2-34). Pfeiltasten ↑↓←→ sind überall gleichwertig.

## Navigation

| Taste | Aktion |
|-------|--------|
| `↑/i` | hoch |
| `↓/k` | runter |
| `←/j` | zurück/raus |
| `→/l` | rein/auf |
| `enter` | öffnen/bestätigen |
| `esc` | zurück |
| `1…9` | Section |

## Views & Global

| Taste | Aktion |
|-------|--------|
| `b` | Backlog |
| `R` | Review-Cockpit |
| `p` | Projekt wählen |
| `T` | Tag-Manager |
| `/` | Suche |
| `f` | Filter |
| `ctrl+r` | Daten neu laden |
| `ctrl+k` | Command-Center |
| `?` | Hilfe |
| `q` | beenden |

## Aktionen

| Taste | Aktion |
|-------|--------|
| `s` | Status (Issue/Sprint) |
| `S` | Meilenstein-Status |
| `m` | Sprint → Meilenstein |
| `a` | Sprints zuweisen |
| `t` | Tags zuweisen |
| `d` | löschen (Cascade) |
| `y` | Kontext kopieren |
| `space/x` | Facette an/aus |

## Kontext-Hinweise

- `s` / `S` / `d` / `m` / `a` wirken auf den **fokussierten Knoten** (Meilenstein / Sprint / Issue) — je nach Tiefe bzw. Tree-Selektion.
- `q` / `ctrl+c` öffnen auf Top-Level den Beenden-Confirm (DD2-49); in Sub-Formularen/Modals brechen sie direkt ab.
- In Suchfeldern (Tree `/`, Memory `/`) und im Command-Center tippen Buchstaben als Text — die Navigations-Bindings greifen dort nicht.
