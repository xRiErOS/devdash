# Screen-Spec: BacklogPage

**Route:** `/:slug/backlog` · **Ebene:** Project · **Aufwandsklasse:** **L2-Compose nach Vorstufe** — Restkette ist rein mechanisch (3 Archiv-Extraktionen + 1 Story-Stabilisierung), kein Net-New mehr · **C4-Tier:** §6 nennt „LOW"; real MEDIUM (Archiv-Extraktions-Vorstufe), post-Trim LOW-Compose

> **Quelle der Wahrheit:** echtes C4 `specs-DD/01-PRD-SAD-FSD/architecture/architecture.components.backlog.yaml` + Legacy `src/views/BacklogPage.jsx` (`realization: wired`, DD-526 IST=SOLL). Diese Contract.md ersetzt das **illustrative** BacklogPage-Beispiel im `gf2-screen-contract-TEMPLATE.md`, das vom realen C4 driftete (falsche API `/api/issues`, erfundene Anker `screen:backlog:*`, unterschätzter Scope). JIT-Pull-Befund 2026-06-24.
> **SOLL getrimmt (grill-me 2026-06-24, project_memory `GF2-BACKLOG-SCOPE` id 725, D01–D04):** Legacy-Parität bewusst gekürzt (D12/R4). dnd-kit Drag&Drop, Undo/Redo, SplitButton-Sprint-Create, RefinementSummary-Pane → **Deferred-v2** (s.u.), NICHT im ersten SOLL.

## Zweck
Eingangskanal aller Issues. **Master-Detail**: Issue-Liste links (nur Status `new`/`refined`, plus `cancelled` via Toggle), Inline-Issue-Detail rechts. Triage + Refinement + Sprint-Zuordnung **per Dropdown**. D48: Stornieren statt Soft-Delete. D49: kein AI-Refine.

## Daten-Scope
`backlog WHERE project=:slug` (Multi-Tenant `project_number`). Default-Filter Status `new`/`refined`; `cancelled` per Toggle einblendbar. Filterbar (Status-Multi/Typ/Erstell-Zeitraum/Sprint-zugewiesen), sortierbar (Key/Prio/…), durchsuchbar (Volltext).

## Bausteine — SOLL-Set (getrimmt) + REAL-Stand (JIT-Pull 2026-06-24)
| Baustein | Heimat | Story-Status | Rolle hier | Aktion nötig |
|---|---|---|---|---|
| SearchField | `04-molecules/04.10-form` | **stable** | Volltextsuche | — |
| Skeleton | `03-atoms/03.20-display` | **stable** | loading | — |
| Button / IconButton | `03-atoms/03.10-inputs` | **stable** | New-Control (nur Issue-Create, D02) | — |
| FilterPopover | `components/ui/molecules` | **archive** | konsolidiertes Filter-Menü | Archiv→stable (`/dd-build-story`, Canon-R12 move+rm) |
| IssueRow | `components/ui/organisms` | **archive** | Listen-Zeile (Master) | Archiv→stable |
| BacklogDetails | `components/ui/organisms` (Story 06.60) | **review** | Detail-Pane (Meta-Felder nebeneinander, Quick-Edit, Status-/Löschen-Cluster) | review→stable (PO); löst IssueMetaCard ab (GF-2 DD-Review 2026-06-24) |
| BulkActionBar / BulkBar | `components/ui/organisms` | **kein Story** | Mehrfachauswahl-Leiste | Story bauen→stable |

**Deferred-v2 (NICHT im SOLL):** SplitButton (D02) · RefinementSummary (D03, war Net-New) · Sprint-Drop-Zone DraggableRow/SprintDropChip dnd-kit (D01).

## API (real `/api/backlog`, Zod `contracts/backlog.contracts.js`)
| Zweck | Method + Endpoint | Contract (file:line) |
|---|---|---|
| Liste laden (Filter/Suche) | `GET /api/backlog` | — (Query) |
| Issue anlegen | `POST /api/backlog` | `issueCreateContract` :27 |
| Issue-Felder patchen (Typ/Prio/Milestone) | `PUT /api/backlog/:id` | `issueUpdateContract` :47 |
| Status ändern (lifecycle-validiert) | `PATCH /api/backlog/:id/status` | `issueStatusContract` :64 |
| Sprint zuordnen (Dropdown) | `PATCH /api/backlog/:id/sprint` | `issueAssignSprintContract` :70 |
| Bulk (Move/Cancel) | `PATCH /api/backlog/bulk` | `backlogBulkContract` :88 |
| In Projekt verschieben | `POST /api/backlog/:id/move` | `backlogMoveContract` :102 |
| Export | `GET /api/backlog-export?format=md\|csv` | — (Format-Param) |

> Status-Transition NUR über `server/lib/lifecycle.js` (nie direkt SQL). Capture-Host: BacklogPage läuft auf `devdash.*`, NICHT auf `issues.*` → kein Capture-Allowlist-Bezug.

## States
| State | Darstellung |
|---|---|
| loading | Skeleton-Liste (`loading` useState, Legacy :325) |
| empty | EmptyState + CTA `backlog.empty-state.create-issue` |
| error | Error-Panel + Retry |
| populated | Master-Detail: gefilterte IssueRow-Liste + Inline-Detail-Pane |

## Actions (SOLL getrimmt — Toast Pflicht je Backend-Effekt)
| id | Trigger | Verhalten | Toast |
|---|---|---|---|
| `create-issue` | Button „Neues Issue" (plain, D02) | öffnet IssueCreate → `POST /api/backlog` | success + error |
| `change-status` | IssueRow Status-Button | `PATCH …/status` (lifecycle) | success + **error** (invalider Übergang) |
| `assign-sprint` | BacklogDetails Sprint-Dropdown (D01) | `PATCH …/sprint` | success + error |
| `change-type`/`-priority`/`-milestone` | BacklogDetails Dropdowns | `PUT /api/backlog/:id` | success + error |
| `delete` | BacklogDetails Löschen (im Transition-Cluster) → DeleteConfirmModal | `DELETE /api/backlog/:id?force=1` | success + error |
| `bulk-move` / `bulk-cancel` | BulkBar | `PATCH …/bulk` (cancel = D48 Stornieren) | success + error |
| `export` | ActionsMenu | `GET /api/backlog-export` | Browser-Download (kein Toast) |
| `filter`/`sort`/`search`/`cancelled-toggle` | FilterPopover/SearchField | URL-State | — |

**Deferred-v2 Actions:** `assign-sprint` per Drag&Drop + `undo`/`redo` (D01).

## data-ui-Anker (SOLL — leben in C4 `backlog.yaml`, hier gespiegelt, NICHT erfunden)
Gate-enforced (6 kuratierte): `backlog.toolbar.filter.status` · `backlog.toolbar.filter.type` · `backlog.toolbar.filter.sort` · `backlog.toolbar.actions.export` · `backlog.empty-state.create-issue` · `backlog.sprint-drop`.
Legacy emittiert zusätzlich (Strukturanker): `backlog` (root) · `backlog.toolbar` · `backlog.toolbar.new` · `backlog.toolbar.actions` · `backlog.toolbar.filter-menu` · `backlog.list` · `backlog.detail-pane`.
> ⚠️ `backlog.sprint-drop` ist Gate-enforced, gehört aber zur Deferred-dnd-kit-Zone (D01) — bei C4-Scharfschaltung als `active` halten (Zone v1 statisch sichtbar) ODER C4-Anker mit-deferren (Architektur-Abstimmung beim Bau).
> Jeder Anker hat Verhaltens-Test (TDD/play) dahinter — Gate prüft Präsenz, Test prüft Korrektheit.

## Feature-Parität (getrimmt, bewusste Inventar-Entscheidung — D12/R4)
- [x] Master-Detail (Liste + Inline-Detail-Pane)
- [x] new/refined-Default + cancelled-Toggle (D48)
- [x] Suche · Filter (Status-Multi/Typ/Zeitraum/Sprint-assigned) · Sort
- [x] Bulk-Select + Move/Cancel
- [x] Sprint-Zuordnung **per Dropdown** (D01)
- [x] Status-Transition mit Fehler-Toast · Export (md/csv)
- [x] Issue-Create via plain Button (D02)
- [ ] ~~Sprint-Zuordnung per Drag&Drop + Undo/Redo~~ → Deferred-v2 (D01)
- [ ] ~~RefinementSummary im Detail-Pane~~ → Deferred-v2 (D03, tiefes Refinement via IssueDetail)
- [ ] ~~SplitButton Sprint-Create~~ → Deferred-v2 (D02)

## Out-of-scope
planned/done-Issues (→ `/:slug/issues`) · Dependency-Graph (gedroppt) · AI-Refine (D49).

## C4-Aktivierung (D13)
Beim Bau: Realization von Legacy (`src/views/BacklogPage.jsx`) auf `src/screens/BacklogPage/` umbiegen, kuratierte Anker `active`/`wired` halten (`backlog.sprint-drop` s. Anker-Hinweis), `_shell/routes.jsx` `BacklogPage`-lazy-Import umbiegen. **Erst nach Baustein-Stabilisierung** (Vorstufe).

## Build-Voraussetzungs-Kette (getrimmt, D01–D04)
1. **Vorstufe — `/dd-build-story` seriell-gebündelt (D04, NICHT parallel — Snapshot-Auto-Glob L3/L8):**
   Archiv→stable (move + `git rm` Twin, Canon-R12): **IssueRow · IssueMetaCard · FilterPopover** · Story→stable: **BulkActionBar**. PO Sammel-Abnahme `status:stable`.
   > Nachtrag (GF-2 DD-Review 2026-06-24): IssueMetaCard wurde im Detail-Pane durch den neuen Organismus **BacklogDetails** (06.60 Entity Details) abgelöst — kanonische MetaDataWidget+TransitionActionsWidget statt Archiv-Card. IssueMetaCard-Datei-Sunset offen (Legacy-Kette `src/views/BacklogPage.jsx` ← BacklogTab ← ProjectHomeView noch live), s. T05.
2. **Dann `/dd-screen` BacklogPage:** getrimmtes SOLL komponieren + `/api/backlog` verdrahten + 4 States + Toasts + C4 scharf + Route-Flip.
3. **Deferred-v2 → Backlog-Issues:** dnd-kit Drag&Drop+Undo/Redo (D01) · RefinementSummary-Pane (D03) · SplitButton Sprint-Create (D02).
