# DESIGN — cli-go TUI (Catppuccin Macchiato)

Visuelle Wahrheit der Go-TUI. Palette = Catppuccin **Macchiato**, TrueColor-Hex. Token-Single-Source = `internal/theme/theme.go` — bei Konflikt gewinnt der Code; diese Datei bindet die **Wireframe-Rollen** an Tokens. Wireframe: PO-Vorlage „Tree+Detail Projekt-Browser" (2026-06-27).

## Verbindliche Entscheidungen (Grill 2026-06-27, alle 🟢)

| Code | Entscheidung |
|------|--------------|
| D01 | **Keine Schriftgrößen** (feste Monospace-Zelle). Hierarchie nur über Farbe + Gewicht. |
| D02 | Zwei Peach-Token: `Peach #f5a97f` (struktureller Akzent) + `Select #fe640b` (Interaktion/Auswahl). |
| D03 | Marker `o`/Chevron `>` = `Peach #f5a97f`. |
| D04 | Prio-Ampel cli-go-weit: P1+P2 `Red`, P3 `Text`, P4 `Green` (Divergenz vom Frontend bewusst). |
| D05 | Tags = Backend-Farbe je Tag (Titel + Color), TUI-Tag-Anzeige „upcoming". |
| D06 | Helle Wireframe-Flächen = Platzhalter; real BG `Base`, Felder/Body nur über Border `Overlay`. |
| D07 | Aktiver Tab / aktive Column = `Mauve` bold; inaktiv = `Hint`. |
| D08 | Tree-Cursor = Balken `▌` + ganze Zeile in Akzentfarbe getönt. |
| D09 | Status-Dots: hohl `○` = geplant/nicht-gestartet, `✗` = abgebrochen/abgelehnt, sonst gefüllt `●`; Farbe per `statusColor`. |
| D10 | Projektwechsel = Form `[switch] Project`, Trigger `p`, suchbare Filter-Liste; persistiert `LastProject`. |

### Designregel D01 — Zwei-Klassen-Text (oberste Regel)

Sofort visuell trennbar: **echte Information** (Daten/Werte) = volle Palette-/Text-Farbe, ggf. bold. **Hinweis/Erklärung** (Labels, Sub-Label, Shortcuts, Placeholder, inaktive Tabs) = muted `#7c7c7c` (`Hint`), regular. Nie beide gleich gewichtet.

## Layout-Hülle (vier Zonen)

```
┌ Globaler Header ───────────────────────────────────────────────┐
│ > slug: Page Title | Kontext          Globale Shortcuts (rechts)│
├ Tree (schmal) ─────────┬ Detail + Accordion (breit) ───────────┤
│ [Suche /] [Filter]     │ > S16 Sprint Title                     │
│ ▸ ● M14 Meilenstein    │ Meta-Strip (Label / sublabel muted)    │
│   ▸ ● S15 Sprint        │ > [1] Section …  (offen)               │
│   …                    │ > [2] Section …  (zu)                  │
├────────────────────────┴────────────────────────────────────────┤
│ Lokale Shortcuts (view-spezifisch)                              │
│ Meldungen/Hinweise (blau)            Kritische Fehler (rot)     │
└─────────────────────────────────────────────────────────────────┘
```

## Farb-Rollen → Token

| Rolle (Wireframe) | Hex | Token (`theme`) |
|---|---|---|
| Chevron-Glyph `>` (slug, Entity-Header, Section-Heads) | `#f5a97f` | `Peach` |
| Page-/Entity-Title + **aktive** Column/Pane | `#c6a0f6` | `Mauve` (`Header`/`Accent`) |
| IDs / Keys (M14, S16, DD2-7) | `#7dc4e4` | `Sapphire` |
| Status-Dots (M/S/Issue) | statusgemäß (D09) | `statusDot` / `statusColor` |
| Issue-Type-Icon | typgemäß | `TypeIcon` / `typeColor` |
| Tags | Backend-Farbe je Tag (D05) | Tag-`Color` (upcoming) |
| Meta-Strip Sub-Label („milestone", „prio" …) | `#7c7c7c` | `Hint` (neu) |
| Lokale + globale Shortcuts | `#7c7c7c` | `Hint` (neu) |
| Hinweis-/Meldungs-Zeile (Footer links) | blau | `Blue` |
| Kritische Fehler (Footer rechts) | rot | `Red` |

## Flächen / Hintergründe

| Fläche | Hex | Token |
|---|---|---|
| TUI globaler Hintergrund | `#24273a` | `Base` |
| Accordion-**Body**-Hintergrund | `#24273a` | `Base` |
| Accordion-**Header**-Hintergrund | `#1e2030` | `Mantle` |
| Accordion-Border | `#1e2030` | `Mantle` |

> **D06**: Helle Flächen in den Wireframes (Inputs, Accordion-Body) = Platzhalter. Real bleibt der dunkle `Base`-BG; Felder/Body grenzen sich **nur über Border `Overlay #8087a2`** ab — kein heller Fill.

## Prioritäten (D04 🟢)

Ampel-Schema, **cli-go-weit** in `theme.priorityColor` (Single Source, trifft TUI + One-Shot-Tabellen):

| Prio | Farbe | Token |
|---|---|---|
| P1 + P2 (kritisch/hoch) | rot | `Red #ed8796` |
| P3 (mittel) | weiß | `Text #cad3f5` |
| P4 (niedrig, tiefer) | grün | `Green #a6da95` |

Bewusste Divergenz vom React-Frontend (`danger/warning/info/neutral`) — anderes Surface. `Priority()` Bold-Logik (P1/P2) bleibt.

## Such-/Filterbox (Tree-Kopf)

- **Filter inaktiv**: Shield-Icon + Hint-Text `#7c7c7c` (`Hint`).
- **Filter aktiv**: Shield-Icon **und** Text rot (`Red #ed8796`).
- `/` triggert Suche (Hint „Suchen mit /").

## Tags (D05 🟢)

- Farbe je Tag aus dem **Backend** (Tag-Entität trägt `Color`), Titel + Color.
- TUI-Tag-Anzeige = „upcoming" (Tags im TUI noch nicht sichtbar; bei Einführung Backend-Farbe verwenden, nicht alternierend).

## Forms (huh) — einfache Form ohne Scroll/Paging

Wireframe „[Form] Create Issue" (2026-06-27). Form = Modal über dem Screen, vier Zonen mit eigener Border je Zone.

```
┌ Header (BG Mantle) ────────────────┐
│ o [Form] Create Issue              │
├ Body (BG Base) ────────────────────┤
│ Titel / Bezeichner                 │
│ ┌ Input (Border Overlay) ────────┐ │
│ Beschreibung                       │
│ ┌ Textarea (Border Overlay) ─────┐ │
│ Typ                                │
│ [Feature][Bug][Improve][Chore]…   │  ← aktiv = Peach #fe640b
├ Footer ────────────────────────────┤
│ Keybindings (form-spezifisch)      │
└────────────────────────────────────┘   Rahmen-BG = Crust #181926
```

| Rolle (Form) | Hex | Token |
|---|---|---|
| Form-Rahmen-BG (Modal-Backdrop) | `#181926` | `Crust` |
| Header-Box-BG | `#1e2030` | `Mantle` |
| Body-Box-BG | `#24273a` | `Base` |
| Input-/Textarea-Border | `#8087a2` | `Overlay` |
| Select aktiv (Highlight) | `#fe640b` | `Select` (neu) |
| Feld-Labels („Titel / Bezeichner" …) | muted | `Hint` / `Dim` |
| Footer-Keybindings | `#7c7c7c` | `Hint` (neu) |

- **Feldtypen → huh**: Titel = `huh.Input`, Beschreibung = `huh.Text` (mehrzeilig), Typ = `huh.Select` **horizontal**. Forms als Sub-Modell in `forms.go` (kein eigenes `form.Run()`).
- **Zwei Peach (D02/D03 🟢)**: `Peach #f5a97f` = Chevron `>` / `o`-Marker / Status — struktureller Akzent. `Select #fe640b` = aktiver Select-Button — exklusiv Interaktion. Getrennte Token.

## Forms mit mehreren Blättern (Tabs)

Wireframe „[Form] Create Issue, mehrblättrig" (2026-06-27). Wie Single-Form, plus **Tab-Strip** zwischen Header und Body.

```
┌ Header (BG Mantle) ────────────────┐
│ o [Form] Create Issue              │
├ Tab-Strip (schmal) ────────────────┤
│ [tab 1] [tab 2] [tab 3]            │  ← aktiv fett/dunkel, inaktiv muted
├ Body (BG Base) ────────────────────┤
│ … Felder wie Single-Form …         │
└ Footer ────────────────────────────┘
```

- Tab-Strip = eigene schmale Zeile unter Header (BG `Mantle`).
- **D01**: keine echten Schriftgrößen — „kleiner/untergeordnet" via Farbe + Gewicht, nicht Punktgröße.
- **D07**: aktiver Tab = `Mauve` bold (gleiche „aktiv"-Sprache wie aktive Column); inaktive Tabs = `Hint` regular.

## Projekt-Switch-Form `[switch] Project` (D10 🟢)

Wireframe (2026-06-27). Projektwechsel = Form, Trigger **`p`** aus jedem View. Restylt den vorhandenen `viewPicker` (persistiert `LastProject` bereits, `config.Save`).

```
┌ Header (BG Mantle) ────────────────┐
│ > [switch] Project                 │   ← `>` = Peach
├ Body (BG Base) ────────────────────┤
│ Search                             │   ← Label Hint
│ ┌ Input (Border Overlay) ────────┐ │
│ │ | dd2                          │ │   ← Tipp-Filter
│ ┌ Liste (Border Overlay) ────────┐ │
│ │   Devdashboard (dd | devdash)  │ │
│ │ ▶ Devdashboard (dd | devdash)  │ │   ← Cursor ▶
│ │   …                            │ │
├ Footer ────────────────────────────┤
│ Keybindings (form-spezifisch)      │
└────────────────────────────────────┘
```

- Zeilenformat: `Name (prefix | slug)` — `Name` echte Info (Text), `(prefix | slug)` Sub-Info (Hint).
- Suche: `bubbles/textinput`, tippt → filtert Liste (fuzzy auf Name/prefix/slug). Filter aktiv → Text rot (`Red`), sonst `Hint`.
- Cursor `▶` = aktive Zeile; enter → `config.Save(LastProject=slug)` + scoped Client neu (vorhandene Picker-Logik).

## Token-Stand (Build)

**Erledigt (T01, `theme.go`):**
- `Hint = #7c7c7c` (≠ `Overlay #8087a2`) + `Select = #fe640b` ergänzt.
- `Key`-Style `Lavender` → `Sapphire`.
- `priorityColor` → Ampel (D04). `statusDot` → D09-Logik (hohl/gefüllt/✗).

**Offen (Folge-Tasks, s. Plan `tidy-growing-truffle.md`):** App-Shell-Chrome (T02), Tree-Primat (T03), Suche/Filter (T04), Cursor-Tönung (T06), Meta-Strip (T07), Accordion (T08), Form-Restyle (T09/T10), Projekt-Switch-Form (T11), Maus (T12).
