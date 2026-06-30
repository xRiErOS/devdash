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
| `alt+←/alt+j` | Route back |
| `alt+→/alt+l` | Route forward |

## Views & Global

| Key | Action |
|-------|--------|
| `b` | Backlog |
| `R` | Review-Cockpit |
| `p` | Select project |
| `T` | Tag-Manager |
| `/` | Search |
| `f` | Filter |
| `X` | Clear filters |
| `ctrl+r` | Reload data |
| `ctrl+k` | Command-Center |
| `?` | help |
| `q` | quit |

## Actions

| Key | Action |
|-------|--------|
| `s` | Status (all) |
| `S` | Sort |
| `a` | Assign |
| `c` | Create |
| `t` | Assign tags |
| `d` | delete (cascade) |
| `y` | Copy context |
| `space/x` | Toggle facet |

## Review

| Key | Action |
|-------|--------|
| `a` | Pass verdict |
| `x` | Reject + comment |
| `o` | Reopen issue |
| `w` | Rework issue |
| `r` | Set result |
| `P` | Mark review pass |
| `C` | Complete sprint |

## Context notes

- `s` / `a` / `c` / `d` act on the **focused node** (milestone / sprint / issue) — depending on depth or tree selection.
- `q` / `ctrl+c` open the quit confirm at top level (DD2-49); in sub-forms/modals they cancel directly.
- In search fields (tree `/`, memory `/`) and the command center, typing letters as text — the navigation bindings do not apply there.
