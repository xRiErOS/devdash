# DevD Cockpit — Keyboard Shortcuts

> Generated from the central keymap (`internal/tui/keymap.go`, DD2-47).
> Do not edit by hand — regenerate with:
> `go test ./internal/tui/ -run TestShortcutDoc -update-golden`

Direction cross: **jkli** — `i`=up, `j`=left/back, `k`=down, `l`=right/in (DD2-34). Arrow keys ↑↓←→ are equivalent everywhere.

## Navigation

| Key | Action |
|-------|--------|
| `↑/i` | up |
| `↓/k` | down |
| `←/j` | back/out |
| `→/l` | in/expand |
| `enter` | open/confirm |
| `esc` | back |
| `1…9` | Section |

## Views & Global

| Key | Action |
|-------|--------|
| `b` | Backlog |
| `R` | Review-Cockpit |
| `p` | Select project |
| `T` | Tag-Manager |
| `/` | Search |
| `f` | Filter |
| `ctrl+r` | Reload data |
| `ctrl+k` | Command-Center |
| `?` | help |
| `q` | quit |

## Actions

| Key | Action |
|-------|--------|
| `s` | Status (Issue/Sprint) |
| `S` | Milestone status |
| `m` | Sprint → milestone |
| `a` | Assign sprints |
| `t` | Assign tags |
| `d` | delete (cascade) |
| `y` | Copy context |
| `space/x` | Toggle facet |

## Context notes

- `s` / `S` / `d` / `m` / `a` act on the **focused node** (milestone / sprint / issue) — depending on depth or tree selection.
- `q` / `ctrl+c` open the quit confirm at top level (DD2-49); in sub-forms/modals they cancel directly.
- In search fields (tree `/`, memory `/`) and the command center, typing letters as text — the navigation bindings do not apply there.
