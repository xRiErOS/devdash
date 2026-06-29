# TUI Detail-Edit — Plan, Umfang & Spirit (DD2 cli-go)

> **PFLICHT-READ** für jede Session, die an der editierbaren Detail-Fläche der Go-TUI
> arbeitet (Sprints DD2#12 / DD2#13 / DD2#14, Meilenstein TUI M1 = id 42).
> Diese Datei ist die **Guardrail**: Ziel, Scope, verbindliche Decisions, Out-of-Scope.
> Bei Konflikt mit Tagesimpuls gewinnt dieser Plan — Abweichung nur mit PO-Freigabe.

## Ziel

Issue-, Meilenstein- und Sprint-Detail von **read-only** zur **editierbaren Arbeitsfläche**
machen. Der Nutzer wählt eine Entität im Tree, „geht ins Detail", navigiert die Felder mit
zwei-Ebenen-Fokus und editiert ein Feld über eine eingebettete huh-Form. Aufsetzend auf der
gelandeten Detail-Pane (DD2#11: Grid-Primitiv, Meta-Strip, ziffern-Accordion).

## Zweck / Spirit (Guardrails)

- **Tree bleibt Primat.** Das Detail wird zur Vollbreite-Arbeitsfläche, der Tree zum Navigator.
- **Eine Bedienlogik über alle drei Entitäten.** Fokus + Edit fühlen sich für Meilenstein,
  Sprint und Issue identisch an — nur Issue hat das Accordion (viele Felder), Meilenstein/Sprint
  eine flache Feldliste (wenige Felder).
- **Mauve = aktiv.** Border-Farbe und Zeilen-Cursor codieren immer „hier liegt der Fokus".
  Genau ein Cursor sichtbar — nie zwei Panes gleichzeitig „aktiv".
- **Muskelmemory wiederverwenden.** `l/→` rein, `h/←` raus, `j/k` Schritt, Ziffer = Sprung —
  gleiche Semantik wie der bestehende Tree.
- **Schreiben ist explizit + sicher.** Ein Feld pro Form, vorbelegt, Submit schreibt, esc bricht
  ab. Strukturierte/abgeleitete Felder werden NICHT freitext-editiert.
- **Primitive nicht duplizieren.** `grid()/gridColWidths`, `metaStrip`, `detailTitle`,
  `renderAccordion` (view.go/accordion.go) sind die Bausteine — darauf bauen, kein Zweit-Layout.

## Verbindliche Decisions (Grill 2026-06-27, alle 🟢 — NICHT neu aufrollen)

| Code | Decision |
|------|----------|
| D01 | **Zwei-Pane-Fokus.** `enter` / „ins Issue gehen" verlagert den Fokus Tree→Detail-Pane; dort werden die Felder navigiert. |
| D02 | **Zwei-Ebenen-Fokus.** `j/k` springt Section-Header (Issue) bzw. Felder (Meilenstein/Sprint); `l/→` = in die Section rein aufs erste Feld; `h/←` = eine Ebene zurück (oberste → Tree); Ziffer `1..n` = Direktsprung in Section. KEIN langer `j/k`-Lauf über alle Felder. |
| D03 | **Doppel-Indikator.** Aktiver Pane = Mauve-Border (inaktiv Overlay); aktive Zeile (Section/Feld) = D08-Balken `▌` + Akzent-Tönung. Nur der fokussierte Pane zeigt seinen inneren Cursor (Tree-Cursor friert bei Detail-Fokus). |
| D04 | **Single-Field huh-Overlay.** `enter` auf Feld → neuer `formKind="editField"` + State (Entität/ID/Feld/Wert). Editor je Feldtyp: Input (kurz) · Text (lang) · Select (`type`, `priority`). `esc` = abbrechen, Submit → Update. Mit aktuellem Wert vorbelegt. |
| D05 | **Speichern in-place.** Submit → `Update{Issue,Milestone,Sprint}` gibt die aktualisierte Entität zurück → `…UpdatedMsg` ersetzt den Cache-Eintrag (treeIssues/treeFilterIssues bzw. milestones-Slice). Kein Refetch. Fehler → `errNote` rot. |
| D06 | **`result` read-only.** Wird nur über das Review gesetzt (`set_result`, strukturierter YAML), retrograd einsehbar. Kein Freitext-Edit. |
| D07 | **`milestone` abgeleitet (nur Anzeige), `plugin_key` ignorieren.** Es gibt keine direkte Meilenstein↔Issue-Beziehung — `milestone` folgt dem Sprint. `plugin_key` = DB-Müll (separater Cleanup), nicht rendern/editieren. |
| D08 | **Edit-Scope = alle drei Entitäten** (Meilenstein, Sprint, Issue). |
| D09 | **Meilenstein/Sprint-Detail = flache Feldliste, KEIN Accordion** (wenige Felder). `detailTitle` + `metaStrip` + Felder; Feld-Fokus dort **einstufig**. Issue bleibt **zweistufig** (Accordion). |
| D10 | **Schnitt in drei Sprints** (s. u.); innerhalb: Fokus-Maschine vor Edit. |

## Editierbares Feld-Set (Single-Source = Zod-Contracts)

Wahrheit: `packages/api-types/backlog.contracts.js` (`issueUpdateContract`) +
`packages/api-types/milestone-sprint.contracts.js` (`milestoneUpdateContract`, `sprintUpdateContract`).

| Entität | Editierbare Felder | Editor |
|---------|--------------------|--------|
| Issue | title, goal, background, description, context_notes, relevant_files, po_notes | Input (title) / Text (Rest) |
| Issue | type, priority | Select |
| Meilenstein | name, description, target_date | Input (name/date) / Text (description) |
| Sprint | name, goal | Input (name) / Text (goal) |

**Nicht editierbar (eigene Pfade / nur Anzeige):** `result` (Review), `milestone` (abgeleitet),
`plugin_key` (ignorieren), `status` (Lifecycle / `s`-Menü), `tags`, `assigned_sprint`/`sprint_id`.

## Sprint-Schnitt (D10)

| Sprint | Name | Inhalt | Dep |
|--------|------|--------|-----|
| DD2#12 | TUI S8: Detail Fokus & Edit (Issue) | I1 Fokus-Maschine (read-only nav, D01-D03) → I2 Issue-Feld-Edit (D04-D05) | I2→I1 |
| DD2#13 | TUI S9: Edit auf Meilenstein & Sprint | I3 Meilenstein/Sprint-Detail flache Feldliste (D09) → I4 Update{Milestone,Sprint}-Client + editField für beide (D08) | I3→S8; I4→I3 |
| DD2#14 | TUI S10: Detail-Politur & Fixes | I5 Create-Issue-Form Freitext `description`→`po_notes` (Bug B01) + Rest-Politur | — |

**Reihenfolge zwingend:** S8 zuerst (Fokus-Maschine ist Fundament). I1 read-only, dann I2 Schreibpfad.

## Out of Scope / Nicht anfassen

- Kein Edit von `result`, `milestone`, `plugin_key`, `status`, `tags`, Sprint-Zuweisung über diese Forms.
- Kein Accordion für Meilenstein/Sprint.
- Kein neues Layout-Primitiv, solange `grid/metaStrip/detailTitle/renderAccordion` reichen.
- Keine Maus-Edit-Interaktion in S8 (Tastatur zuerst; Maus separat, falls überhaupt).
- Ranger-Columns nicht erweitern (nachrangiger Pfad).

## Wiederverwendbare Primitive

- `view.go`: `grid()/gridColWidths`, `metaStrip()/metaPair`, `detailTitle()`, `chrome()`.
- `accordion.go`: `issueSections()`, `renderAccordion()`, model-Feld `accOpen`.
- `forms_shared.go`: `buildForm()`, `openForm()`, `formBox()`, `formCreateCmd()`, `updateForm()` (huh-Sub-Modell, `formKind`-Dispatch, esc=cancel).
- `internal/api`: `UpdateIssue(id, fields)` existiert; **`UpdateMilestone`/`UpdateSprint` fehlen** → in S9 ergänzen (Backend-PUT `/api/milestones/:id` + `/api/sprints/:id` existiert).

## Prozess-Leitplanken (Repo-weit)

- KI **startet/schließt nie** einen Sprint, setzt nie `passed`/`done` (DD-186). Sprint-Create (planning) ist OK, PO startet.
- KI **deployt nie** auf NAS. Lokale Commits auf `main`; **Push nur bei Version-Tag** `vX.Y.Z`.
- TDD für Verhalten/Logik (vitest-analog: `tea.KeyMsg`-State-Tests); Präsentation per Golden + Augenschein.
- `command go` (nie `go` — Shadow); nach Code-Änderung `command go install .` (sonst stale Binary).
- Hybrid-Tests: State + Golden `View()` + TrueColor-Guard (Ascii-Golden verfehlt Farb-Misalignment).
