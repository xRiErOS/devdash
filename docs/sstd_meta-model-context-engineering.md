---
type: SSTD
description: Standortbestimmung der DD2-Wissensarchitektur — Konsolidierung von SOPs, Skills, Documents, GLOSSARY.md, CLAUDE.md, dd-memory zu einem leanen, zuverlässig invozierten System. Synthese aus Pococks writing-great-skills + domain-modeling. Inkl. Backend-Removal-Programm + Gate-Verschiebung auf User-Stories.
tags: [sstd]
aliases: []
relates_to:
uid: 945cffe4-86b3-4357-8088-f47db6768c09
predecessor:
successor:
---

## 1. Session Objective

Vereinfachung des Konvoluts aus **SOPs, Skills, Documents, Prompt-Snippets, CLAUDE.md, dd-memory** → eine Session startet mit *einem* Satz („Bearbeite Sprint DD2#43"), Maschine lädt konsistent den richtigen Kontext, kein manuelles Nudgen.

## 2. Context Frame

- Schmerz: **A** (Redundanz/Pflege) primär · **B** (Start-Friktion) sekundär · **C** (kognitive Last) tertiär. Impact *low* (Sprints laufen), aber Tages-Reibung.
- Repo multi-surface: backend (running), frontend (in_progress), CLI, MCP, TUI.
- Externe Quellen: Pocock `writing-great-skills` + `domain-modeling`; verglichen mit Anthropic `superpowers`.
- Meta-Insight: **live-grilling schlägt async-UIF** (diese Session ist der Beweis, D23).

## 3. Leading Words

| Leitwort | Bedeutung |
|---|---|
| **Predictability** | Wurzel-Tugend: gleicher Prozess je Run |
| **Context Load / Cognitive Load** | Last des Agenten (model-invoked Description) vs Last des Menschen (user-invoked) |
| **model-invoked / user-invoked** | Invocation-Achse = „auto-surface / deliberate" |
| **External Reference + Context Pointer** | Prozedur außerhalb des Skills, Pointer-Wording entscheidet Zuverlässigkeit |
| **Router Skill** | user-invoked Skill, der user-invoked Skills benennt — Kur für Cognitive Load |
| **GLOSSARY.md / GLOSSARY-MAP.md** | Glossar (Begriffe, impl-frei) je Surface |
| **Failure Modes** | premature completion · duplication · sediment · sprawl · no-op |
| **Verb / Nomen** | Prozedur vs State/Regeln |
| **G1/G2 (User-Story-Gates)** | Lifecycle-Gate auf testbarem Artefakt statt auf Retro-Report |

## 4. Decision Log

| Code | Decision | Status | Rationale |
|---|---|---|---|
| D01 | Ansatz: dünner Skill-Orchestrator + geschichtete Prozedur-Refs | 🟢 | eine Invocation-Fläche, heute (ad-hoc) + später (TUI-Shortcut) |
| D02 | Prozedur splitten: generisch („wie") + projekt-spezifisch (Nomen) | 🟢 | eine SOP mischt Verb+Nomen → verfettet |
| D03 | Binding = 3-Stufen: CLAUDE.md (always-on) · model-invoked · user-invoked | 🟢 | „verbindlicher" = falsche Frage; richtig „auto oder deliberate" |
| D04 | CLAUDE.md = Leitplanken + Wegweiser, nie Prozedur | 🟢 | löst 200-Regeln-Limit |
| D05 | GLOSSARY.md-Netz (Pocock) als 4. Tier, gepflegt von `domain-modeling` | 🟢 | „command view" = TUI-Begriff; progressive disclosure |
| D06 | Zwei Achsen: spatial (Tiefe) + topical (`docs/`); Router = Join | 🟢 | data-ui lebt topical, nicht ort-gebunden |
| D07 | data-ui: Regel→`docs/`, Begriff→Glossar, **Fundstelle→Router** | 🟢 | Begriffe stabil, Locations churnen |
| D08 | ADRs → `project_memory`, kein `docs/adr/` | 🟢 | Rolle schon belegt |
| D09 | `uif`-Skill bleibt, `SOP-user-input-datei` raus | 🟢 | Skill gewinnt |
| D10 | Decisions → `grill-me`; Pococks `domain-modeling` nur Glossar | 🟢 | grill-me effizienter, komplementär |
| D11 | Pocock = Architektur-Ökonomie, Anthropic = Runtime-Enforcement → beide | 🟢 | Zwei-Lasten fürs Design, Gates/MUST im Body |
| D12 | `/run-sprint` getrennt von `/end-session` = by-sequence-cut | 🟢 | verhindert premature completion |
| D13 | `lessons_learned` → `project_memory` (queryable, skill-verankert) | 🟢 | am Issue tot/unabrufbar; memory = lebende KB |
| D14 | result-Pflicht-Blocker raus | 🟢 | Prä-Review-Relikt; memory ist die KB, nicht der Abschlussbericht |
| D15 / G1 | Issue → `passed` nur wenn alle user_stories passed | 🟢 | Gate auf testbarem Artefakt (vollendet D09) |
| D16 / G2 | Issue → Sprint-Assign nur mit ≥1 user_story | 🟢 | kein Work ohne testbare Abnahme |
| D17 | Router = beide; Router-Skill als letzter Schritt der Bau-Welle | 🟢 | user-invoked DD-Set 4→6 reißt Schwelle |
| D18 | `/run-sprint` voller Bogen bis review, **lean SKILL.md + Pointer** | 🟢 | kein Monster-Skill |
| D19 | Runbooks bleiben `/docs`, nur Pointer fixen | 🟢 | DD-SOP = nur PO-Sprint-Prozess |
| **D20** | **DD-DB-SOP-Layer killen** — generisch→Skill-Ordner-Ref, projekt→`/docs` | 🟢 | DB-Vorteil von Skill-Ordner-Ref erfüllt; Collections leer; TUI-Edit verkraftbar (nvim) |
| D21 | dd-memory: Kern+Tags+Anchor behalten, nur SSTD raus | 🟢 | Anchor = supersede-Adressierung + Code-Handle (geprüft) |
| D22 | Reihenfolge: Fundament-MVP → Keystone → Backend-Removal zuletzt | 🟢 | Keystone braucht migrierte Ref; Risiko gebündelt |
| D23 | Kein UIF, direkt Spec | 🟢 | Decisions live gefällt; durabler Record = Spec |

## 5. Key Insights

- **Eriks Intuitionen sind Pocock-Theorie**: deliberate `/end-session` = user-invoked + by-sequence-cut.
- **Glossar speist Leading Words** → Tier 2 macht Tier 3 zuverlässig.
- **git history IST das journal** (1 Commit/Issue + DD2-N) — Memory-Layer kollabiert 3→2 (`project_memory` + git + handover-on-demand).
- **D20 ist der Architektur-Pivot**: der ganze `devd_sop_*`-Layer ist redundant, weil generische Prozedur global im Skill-Ordner (git) und projekt-Spezifik in `/docs` (git) leben kann.
- **G1/G2 verschieben das Gate** vom Retro-Report (`result`) auf das PO-testbare Artefakt (`user_stories`).

## 6. Current State of Understanding

**Stabil (high):** Gesamtmodell + alle Decisions D01–D23 entschieden. Backend-Removal-Umfang geklärt. **Welle 1–3 gebaut:** Keystone `/run-sprint` + Projekt-Layer (W1) · `/operationalize`+`/backlog`+Router-Skill `/devd-skills` (W2) · CLAUDE.md-lean + GLOSSARY.md-Netz + `domain-modeling`-Skill (W3, 2026-07-01).

**Offen (medium):** Welle 4 (Backend-Removal, riskant/zuletzt): `devd_sstd_*`+DD-DB-SOP raus, result-Gate→G1/G2, TUI verschlanken (B01=DD2-250). Migrations-Detail G2-Grandfathering (Q06). `/find-stuff` (T13) optional (Q07). PO-Trockenläufe der user-invoked Skills + `domain-modeling`-Invocation ausstehend (Skill-Loading nur im Haupt-Harness, nicht fakebar).

## 7. Memory-Modell (final)

| Rolle | Frage | Heimat |
|---|---|---|
| Fakten/Decisions/Patterns/lessons | „was ist jetzt wahr + warum" | `project_memory` (+ Tags + Anchor) |
| Session-History/Chronologie | „was wann" | **git history** |
| Handover | „wo stehen wir" | `/next-session-prompt` (on-demand) |

## 8. Content-Modell (final)

4 Tiers · 2 Achsen · 3 Binding-Stufen:

- **Tier 1 CLAUDE.md** (always-on): Invarianten + Router (spatial: directory · topical: `docs/`).
- **Tier 2 GLOSSARY.md-Netz** (on-demand by surface): Glossar, gepflegt von `domain-modeling`.
- **Tier 3 generische Prozedur** (Skill-Trigger): **Skill-Ordner External Reference** (NICHT mehr DD-DB).
- **Tier 4 projekt-spezifisch** (`/docs` + Documents): Regeln/State.

## 9. Open Questions

| Code | Frage |
|---|---|
| Q06 | G2-Grandfathering: Bestand-Issues ohne user_story in Sprints — Backfill-Strategie? |
| Q07 | `/find-stuff` (T13) — wann nötig, oder bleibt CLAUDE.md-Router + git-grep dauerhaft genug? |

## 10. Umsetzung (operationalisiert)

Modell + Wellen sind umgesetzt und leben jetzt in Skills, nicht mehr als Plan hier.

- **Bau/Konform:** Skill `/context-model` (audit→plan→transform→unbiased-verify gegen `CHECKLIST-universal.md`).
- **Neu-Onboarding:** Skill `/init-project`.
- **Neue Decisions D25–D30** (INDEX.md-Subsystem, context-model-Skill, 2 Checklisten, Managed-Region, `/compress`-Tail, SSoT) + voller Bau-Log: DD `project_memory` Anchor `DD2-CTXENG` (#819, 852).

## 11. Offene Punkte Liste

> Diese Liste dient dem Erfassen von losen Enden, Aufgaben und Tasks, die später realisiert werden sollen. 'O$' als fortlaufende Nummerierung ist zu verwenden.

> **O1 - Harness Skill - 🟢 Done**
> Die Pilotierung des Set-Ups im Rahmen des Skill-Einsatzes, CLAUDE.md sowie GLOSSARY.md braucht es einen Skill zum initialisieren neuer Projekte. Dies muss aligned werden mit dem DevArchWiki, da diese zusammen gedacht werden müssen. Relevante Checkliste aus dem DevArchWiki: [[AOS-Checkliste-Projekt-Initialisierung]]
>
> **Umgesetzt (2026-07-01):** user-invoked Skill `/init-project` (`~/.claude/skills/init-project/`). Onboardet ein Projekt ins DevDash-Context-Engineering-System — DevDash-Anlage (`devd-cli project create`) + Lean-Kern-Scaffold (Tier 1 CLAUDE.md-Router · Tier 2 CONTEXT-Netz · Tier 4 `docs/sprint-project-layer.md`) aus `templates/`, plus gestufte optionale AOS-Module M1–M5. Zwei Modi greenfield/retrofit. Alignment DD2-lean ↔ AOS explizit in `AOS-ALIGNMENT.md` (Divergenz-Tabelle + W-Code-Mapping). Im `devd-skills`-Router eingetragen.