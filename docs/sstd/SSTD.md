---
type:
title: SSTD
description: "Session State Transfer Document (CODE) — DD2#37 Freshness-/Coverage-Gate, laufender GLOSSARY.md-Reshape"
tags: []
aliases: []
relates_to:
Typ: CODE
Session-IDs:
---

# SSTD — DD2#37 Freshness-Gate & Coverage-Nachweis

## 1. Session Overview

Sprint DD2#37 (Milestone 45 „TUI M3: MCP-First Go-Client (Codegen)") durchgeführt und vom PO passed: CI erzwingt jetzt Codegen-Frische (D07) und L1-Coverage=100% ist maschinell bewiesen statt behauptet. Danach zwei PO-Folgeaufträge (Q01, D01) aus dem Review umgesetzt.

**Nicht behandelt, aber relevant:** eine parallele Session hatte zu Sitzungsbeginn bereits ein `CONTEXT.md → GLOSSARY.md`-Rename-Reshape im selben Repo laufen (unstaged/staged, unfertig). Diese Arbeit wurde bewusst nicht angefasst (nur durch Hunk-Isolation vor Vermischung geschützt) — gehört einer anderen Session/einem anderen Thema.

## 2. Current System State

- `apps/cli-go` hat einen generierten Go-HTTP-Client (`internal/api/generated.go` + `internal/api/generated/generated_types.go` + `internal/api/generated/capabilities.json`), Quelle ist `apps/cli/mcp/devd-mcp.js` (128→111 aktive MCP-Tools nach Welle4-Removals).
- Codegen-Pipeline (`apps/cli-go/codegen/*.mjs`): `capabilities.mjs` → `gen-types.mjs` → `gen-client.mjs` → `gen-skip-allowlist.mjs`, jetzt gebündelt als `npm run gen:cli-client`.
- CI hatte vor diesem Sprint **keinen** Freshness-/Coverage-Gate — Drift war nur durch Disziplin verhindert (und ist es nicht immer gewesen, s. §3/§5).
- Milestone 45 zeigt Status `completed` (alle 5 Sprints DD2#34–37 completed, 27/27 Issues done), aber DoD-Items #8–11 hängen mit `done=0` hinterher (PO-Nachtrag offen, s. §5).

## 3. Changes Introduced in This Session (Delta)

- **DD2-211** — `go:generate`-Direktive in `apps/cli-go/internal/api/client.go` + neuer npm-Script `gen:cli-client` (bündelt die 4 Generatoren) + neuer CI-Workflow `.github/workflows/codegen-freshness.yml` (`git diff --exit-code` über die 4 generierten Artefakte). Warum: D07 sollte Drift zwischen MCP-Tools und Go-Client CI-technisch unmöglich machen. Nebenbefund: Baseline war selbst schon stale (`capabilities.json` toolCount 109 statt 111, weil `devd_project_create`/`delete` ohne Regen committed wurden, commit `10a3765`) — als Teil der Baseline-Etablierung mitgefixt.
- **DD2-212** — neues, von der Codegen-Skip-Logik unabhängiges Script `apps/cli-go/codegen/coverage-check.mjs`: parst `generated.go`-Kommentare direkt, vergleicht gegen `skip-allowlist.json` (bereits hand-implementiert) + neues `agent-only-allowlist.json` (aktuell leer, Mechanismus für künftig bewusst ausgeschlossene Tools). Warum: „100% Coverage" sollte beweisbar sein, nicht nur tautologisch aus dem Generator folgen.
- **DD2-213** — Negativtest live durchgeführt (Dummy-`server.tool` in `devd-mcp.js`, zwei Phasen: Single-apiRequest → Freshness-Gate rot; Multi-apiRequest + bewusst unvollständiger Regen → Coverage-Gate rot), danach vollständig zurückgebaut. Kein bleibender Diff, kein Commit nötig — Repro-Schritte in DevDash-User-Story US-417 dokumentiert.
- **DD2-214** — Sektion „Codegen-Workflow" in `docs/cli-go-build.md` + Trigger-Words-Zeile im Root-`CLAUDE.md`-Doku-Index.
- **Q01 (PO-Folgeauftrag)** — `apps/cli/mcp/CLAUDE.md` um Warnregel ergänzt: nach jeder Tool-Änderung `npm run gen:cli-client` vor Commit, sonst genau der stille Drift aus DD2-211 wieder.
- **D01 (PO-Folgeauftrag)** — `docs/INDEX.md` war laut Drift-Guard veraltet (`gen:index:docs:check`) — neu regeneriert + committed. Achtung: basiert teils auf noch unfertigem Fremd-Reshape-Stand (s. §7).

## 4. Relevant Files & Artifacts

| Datei | Zweck | Änderung |
|---|---|---|
| `apps/cli-go/internal/api/client.go` | Hand-Client, trägt jetzt die `go:generate`-Direktive | ergänzt |
| `apps/cli-go/codegen/coverage-check.mjs` | unabhängiger L1-Coverage-Beweis | neu |
| `apps/cli-go/codegen/agent-only-allowlist.json` | explizite Liste bewusst nicht-generierter Tools | neu, aktuell `[]` |
| `apps/cli-go/codegen/skip-allowlist.json` | generierte Skip-Liste (bereits hand-implementiert) | unverändert diese Session, nur regeneriert |
| `.github/workflows/codegen-freshness.yml` | CI-Gate: Freshness (D07) + Coverage | neu |
| `package.json` | `gen:cli-client`, `gen:cli-coverage-check` | ergänzt |
| `docs/cli-go-build.md` | Sektion „Codegen-Workflow" | ergänzt |
| `apps/cli/mcp/CLAUDE.md` | Stale-Baseline-Warnregel (Q01) | ergänzt |
| `docs/INDEX.md` | generiertes Doku-Manifest | regeneriert (D01) |
| `CLAUDE.md` (root) | Doku-Index-Zeile `docs/cli-go-build.md` | 1 Zeile geändert |

## 5. Open Issues / Bugs / Risks

| Code | Beschreibung | Status |
|---|---|---|
| B01 | Milestone 45 DoD-Items #8–11 zeigen `done=0` trotz `completed`-Sprints | 🟣 offen, PO-Kompetenz |
| B02 | `devd_sstd_journal_add` bekannt kaputt (Backend erwartet `category=session_log`, Tool sendet `session_note` → 400/404) | 🟣 offen, Workaround: `devd_project_memory_log` mit `category=session_log` |
| I01 | `docs/INDEX.md` (D01) wurde regeneriert, obwohl der parallele GLOSSARY.md-Reshape noch nicht vollständig committed ist — nach dessen Abschluss erneut `npm run gen:index -- docs` laufen lassen | 🟡 nachziehen nötig |

## 6. Decisions & Rationale

- **Zwei getrennte Gates statt eines** (Freshness `git diff --exit-code` + unabhängiger `coverage-check.mjs`), obwohl beide bei jeder aktuellen Drift-Klasse gemeinsam auslösen (redundant per Konstruktion). Begründung: Freshness prüft „stimmt der committete Stand mit dem Generator überein", Coverage prüft „deckt der committete Stand jedes MCP-Tool ab" — unterschiedliche Fragestellungen, unterschiedliche Ausfallmodi (z.B. ein zukünftiger Bug im Generator selbst würde Freshness nicht zwingend rot machen, Coverage schon).
- **`agent-only-allowlist.json` jetzt schon angelegt (leer)**, statt erst bei Bedarf. Begründung: DD2-212 verlangt explizit einen Mechanismus, kein nachträgliches Anflicken.
- **Stale Baseline (`capabilities.json`) direkt mitgefixt statt eigenes Issue.** Begründung: Freshness-Gate kann nicht auf verschmutztem Boden starten; Fix ist untrennbar von der Baseline-Etablierung.
- **Fremd-Reshape (GLOSSARY.md) nicht angefasst, nur isoliert.** Begründung: nicht Sprint-Scope, andere Session/anderer Zweck (User bestätigt: Vibe-Coding-Framework-Reshape).

## 7. Assumptions & Uncertainties

- Angenommen: die andere Session (GLOSSARY.md-Reshape) läuft noch/wird selbst committen — `docs/INDEX.md` (dieser Sprint, D01) muss nach deren Abschluss erneut regeneriert werden, sonst driftet es wieder.
- Ungeprüft: ob `agent-only-allowlist.json` je einen echten Eintrag bekommen wird — aktuell 100% Coverage ohne ihn, Mechanismus nur vorsorglich.
- Keine Validierung im echten NAS-Prod-Deploy — CI-Workflow wurde nur lokal simuliert (Regen + Diff-Check), nicht in GitHub Actions selbst ausgeführt (kein Push, Push-Policy nur bei Version-Tag).

## 8. Next Actions (Priority Ordered)

1. PO: Milestone-45-DoD-Häkchen #8–11 nachziehen (Sprints sind fertig, DoD-Flags hinken hinterher).
2. Nach Abschluss des parallelen GLOSSARY.md-Reshapes: `npm run gen:index -- docs` erneut laufen lassen (I01).
3. Health-Check-Update nachziehen (`claude-setup`-Skill) — CLAUDE.md wurde diese Session mehrfach geändert (Setup-Change-Gate ausgelöst, in `/end-session` geflaggt, aber nicht ausgeführt).
4. Optional: ersten echten CI-Lauf von `codegen-freshness.yml` nach nächstem Push auf `main` beobachten (bislang nur lokal simuliert).

## 9. Suggested Entry Point for Next Session

`docs/cli-go-build.md` → Sektion „Codegen-Workflow" lesen, dann `git log --oneline -8` für den aktuellen Commit-Stand. Bei Rückfragen zur Fremd-Reshape-Baustelle: `git status --porcelain` prüfen, ob sie noch unstaged/staged im Working Tree liegt oder inzwischen committed wurde.

## Nächste Skill-Aufrufe

- `/claude-setup` — Health-Check nachziehen wegen CLAUDE.md-Änderungen dieser Session (Setup-Change-Gate offen).
- `/run-sprint` — für den nächsten DD2-Sprint aus der Roadmap (Milestone 45 ist komplett, nächstes Milestone prüfen).
- `/domain-modeling` — falls beim GLOSSARY.md-Reshape neue Begriffs-Konflikte auftauchen, sobald diese Session sichtbar wird.
