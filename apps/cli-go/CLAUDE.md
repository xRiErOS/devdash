# cli-go — Go-CLI + Bubble-Tea-TUI (DD2)

Dual-Layer-Werkzeug für DD2: **One-Shot-Agenten** (cobra, scriptbar) **+ interaktives Cockpit** (Bubble Tea TUI, Meilenstein→Sprint→Issue + Review). Modul `devd-cli`. Spricht das DD2-Backend über `internal/api` (REST, `DEVD_API_URL`).

Nur cli-go-spezifische Regeln hier (D07). Repo-weite Regeln → Root-`CLAUDE.md`. Prozess-Leitplanken gelten weiter: KI setzt nie `passed`/`done`, schließt nie Sprint (DD-186); KI deployt nie auf NAS; lokale Commits, Push nur bei Version-Tag.

## Stack

| Zweck | Lib |
|---|---|
| TUI-Runtime | `charmbracelet/bubbletea` v1.3.10 (Elm/TEA) |
| Styling | `charmbracelet/lipgloss` + `catppuccin/go` |
| Forms (eingebettet) | `charmbracelet/huh` v1.0.0 |
| Markdown-Render | `charmbracelet/glamour` |
| ANSI-Breite/Truncate | `charmbracelet/x/ansi` |
| CLI-Gerüst | `spf13/cobra` |

## Architektur

```
cmd/        cobra-Commands (root, issue, sprint, review, tui, client)
internal/
  api/      REST-Client + Typen (client, issue, sprint, milestone, review, keys, types)
  tui/      Bubble-Tea-Modell + Views (app.go = Modell/Update, view.go = Render)
  theme/    Catppuccin-Tokens + Render-Styles (theme.Header/Dim/Accent, TypeIcon, Priority)
  output/   Tabellen für One-Shot-Ausgabe
  config/   lokaler State
  clip/     Clipboard
main.go     Entry (dünn)
```

- **Modell = Value-Receiver.** `func (m model) Update/View` → `View()` ist reine Funktion ohne Seiteneffekt. Mutationen kopieren `m` und geben es zurück. Helper, die nur lesen, dürfen `*model` sein.
- Ein File, eine Verantwortung. `app.go` (Modell+Update) und `view.go` (Render) sind die großen; neue Screens als eigenes File (`memory.go`, `assign.go`, `delete.go` …).
- huh-Forms laufen **innerhalb** der Loop als Sub-Modell (kein eigenes `form.Run()`); Werte nach `StateCompleted` per keyed `GetString` lesen, nicht per Pointer-Binding (bricht am Value-Copy). Siehe `form_*.go` (`form_issue.go` / `form_milestone.go` / `form_sprint.go` / `form_result.go` / `form_memory.go`) + `forms_shared.go` (Theme, Reset, Box-Chrome).

## Language (i18n-Konvention, DD2-37)

**Alle user-facing TUI-Strings sind Englisch** — Labels, Placeholders, Footer-/Keymap-Hints, Form-Titel, Status-/Toast-Messages, Help-Text, Yank-/Kontext-Markdown. Kein deutsches Wort in gerenderter Ausgabe.

- **Code-Kommentare dürfen Deutsch bleiben** (Projekt-Konvention) — nur Runtime-Strings sind betroffen.
- Identifier, huh-`Key("…")`, Field-Keys, YAML-Feldnamen (`outcome_summary`, `commits:`) sind **keine** UI-Strings → unverändert lassen.
- Neuer Screen/String: direkt Englisch schreiben, nicht erst Deutsch + später übersetzen.
- Regressions-Check (vor Commit): kein `[äöüÄÖÜß]` und kein deutsches Wort in String-Literalen von `internal/tui/*.go` (Test-Fixture-Daten wie Milestone-Namen ausgenommen).
- **Out-of-Scope (Stand DD2-37):** `cmd/*.go` (CLI-Output/Flags) und `internal/api/*.go` (Error-Strings) sind noch Deutsch — separate Schicht, separates Issue.

## TUI File-Konvention

`internal/tui/` folgt **Datei = Verantwortung** mit dem Namens-Schema
`<art>_<verb>_<entität>.go` (`view_`/`form_`/`box_`/`picker_`/`overlay_`).
**Single Source der Konvention + vollständige Datei-Map: [`internal/tui/CLAUDE.md`](internal/tui/CLAUDE.md)** — dort die art-Klassen, das Verb-Vokabular, die Screen-Tabelle und die Infrastruktur-Ausnahmen. Hier nur die großen Querschnitts-Files:

| File | Verantwortung |
|---|---|
| `app.go` | nur `model` + `Update`-Dispatcher (Message-/Key-Routing). Keine Render-Logik. |
| `view.go` | `viewBase`-Dispatcher + geteilte Render-Primitives (`framed`, `chrome`, `statusBar`/Footer, `header`). |
| `messages.go` | alle `tea.Msg`-Typen **+** ihre `tea.Cmd`-Producer (Daten-Fetch/Mutation, die diese Msg emittieren). Kein Update-Dispatch, kein Rendering. |
| `keymap.go` | zentrale `keybind.Binding`-Keymap (Single-Source); Help + `docs/shortcuts.md` daraus generiert. |
| `render_shared.go` / `forms_shared.go` / `modal.go` / `overlay.go` | geteilte Render-/Form-/Overlay-Primitive (Single Source, Fix-in-Root). |



Visuelle Wahrheit = **`DESIGN.md`** (Wireframe-Rollen → Catppuccin-Macchiato-Token, Layout-Hülle, Accordion-/Filter-Farben, offene Token-Arbeit). Token-Single-Source bleibt `internal/theme/theme.go` — bei Konflikt gewinnt Code. Vor Layout-/Farb-Arbeit `DESIGN.md` lesen.

## Detail-Edit-Programm (PFLICHT-READ)

Arbeit an der editierbaren Detail-Fläche (Fokus-Maschine, Feld-Edit, Meilenstein/Sprint/Issue, Sprints DD2#12/13/14) → **zuerst `tui-plan.md` lesen**. Das ist die Guardrail: Ziel/Spirit, verbindliche Decisions D01–D10, editierbares Feld-Set (Contract-Wahrheit), Sprint-Schnitt, Out-of-Scope. Abweichung nur mit PO-Freigabe.

## Bubble-Tea-Skill (installiert)

`~/.claude/skills/bubbletea/` (GGPrompts/TFE, via skillfish) — bei Layout-/Render-/Maus-Arbeit konsultieren. Kern: die **4 Golden Rules** (`references/golden-rules.md`):

1. **Border-Höhe einrechnen** — vor Panel-Render 2 von der Höhe abziehen (top+bottom). Nie `Height()` auf bordered lipgloss-Style — Content auf Innenhöhe auffüllen, Border natürlich wachsen lassen.
2. **Nie Auto-Wrap in bordered Panels** — Text explizit truncaten.
3. **Maus-Detection an Layout koppeln** — horizontal → `msg.X`, vertikal → `msg.Y`.
4. **Weights statt Pixel** — `(totalWidth*weight)/totalWeights`, skaliert bei Resize.

Plus `references/emoji-width-fix.md`, `components.md`, `troubleshooting.md`.

### Skill-Abweichung (PFLICHT beachten — hart erkauft)

Der Skill truncatet mit `len(s)` + `s[:n]` (Byte-Slicing). Das ist **falsch für gefärbte/Emoji-Zellen** und war exakt Bug **B06**: ANSI-Escapes blähen die Byte-Länge → Padding/Truncate verfehlt → Spalten kollabieren, Dots stehen nicht unter ihrer Überschrift.

- Padding/Breite IMMER über `lipgloss.Width(s)` (sichtbare Breite, ANSI+runewidth-bewusst), nie `len`/`fmt %-Ns`. Helper `col()`/`cockpitRow()` in `view.go` — Header und Datenzeile aus derselben Spaltenquelle.
- Truncation über `ansi.Truncate` (charmbracelet/x/ansi), nie String-Slicing.
- Detail: Memory `[[go-tui-ansi-column-padding]]`.

## Tests (Hybrid — `[[tui-hybrid-testing-golden]]`)

| Ebene | Womit |
|---|---|
| State/Verhalten | `Update`-Tests mit `tea.KeyMsg` (nav, status, assign, delete …) |
| Layout-Snapshot | Golden der reinen `View()` → `testdata/*.golden` |
| Farb-abhängige Lage | **TrueColor-Guard** — `cockpit_align_test.go` forciert `lipgloss.SetColorProfile(termenv.TrueColor)` |
| Kontrast/Terminal | Augenschein (irreduzibel) |

**Golden-Update-Workflow:** Wenn sich `View()`-Ausgabe **absichtlich** ändert (z.B. i18n, Layout):

```sh
command go test ./internal/tui/ -run TestGolden -update-golden   # regeneriert testdata/*.golden + docs/shortcuts.md
command go test ./internal/tui/ -run TestCockpit                 # TrueColor-Guard MUSS unabhängig grün sein
```

- **Nie stale Goldens committen** — nach jeder gewollten View-Änderung neu erzeugen, Diff prüfen (nur erwartete Strings dürfen wandern).
- `-update-golden` regeneriert auch die aus der Keymap abgeleitete `docs/shortcuts.md` (TestShortcutDoc) — nicht von Hand editieren.

**Golden-Falle:** `go test` hat keine TTY → lipgloss-Profil = Ascii → ANSI gestrippt → Golden sieht ausgerichtet aus und **verfehlt** Farb-Misalignment (B06). Darum der TrueColor-Test als zweites Netz; defer zurück auf Ascii (Golden erwarten Ascii).

## Build / Run

**PFLICHT-READ für Build/Install (auch aus Worktree): [`docs/cli-go-build.md`](../../docs/cli-go-build.md)** — verlässliche Befehle, `go`-Shadow-Falle, Worktree-Hinweis.

- **`go` ist als Shell-Funktion geshadowed** (Fake). IMMER `command go …` oder `/opt/homebrew/bin/go …`. `make build` meiden (ruft bare `go`) → stattdessen `command go build -o bin/dd .`.
- Build: `command go build -o bin/dd .` → `bin/dd`. Alle Tests: `command go test ./...`.
- Install fürs Cockpit: `command go install .` → `~/go/bin/devd-cli` (Alias `dd-tui`). Nach Code-Änderung neu installieren, sonst testet man ein stale Binary (war B01-Fehldiagnose-Quelle).
