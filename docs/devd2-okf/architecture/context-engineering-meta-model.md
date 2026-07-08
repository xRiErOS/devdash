---
type: Concept
title: Context-Engineering Meta-Model
description: Konzeptpapier zum DD2-Wissensarchitektur-Meta-Modell — welches Wissensstück in welche Schicht gehört und warum. Aufsatz, nicht Referenz.
tags:
  - context-engineering
  - architecture
timestamp: 2026-07-08T00:00:00Z
---

# DD2 Context-Engineering — Das Meta-Modell

*Konzeptpapier. Beantwortet eine einzige Frage in vielen Varianten: **Wohin gehört dieses Wissensstück?** Eine Regel, eine Prozedur, ein Begriff, eine Entscheidung, eine Datei-Fundstelle — jedes hat genau einen richtigen Ort. Wenn jeder Ort sauber ist, läuft eine Session mit einem Satz los, statt mit einem nachgeschobenen „denk an X".*

## 1. Das Problem, knapp

Über die Zeit ist Wissen über das Projekt an fünf Orten gewachsen: SOPs in der DevDashboard-Datenbank, Skills in `~/.claude`, Documents an Sprints und Meilensteinen, Prompt-Snippets in Obsidian, und CLAUDE.md-Dateien im Repo. Dieselbe Prozedur lebt teils mehrfach. Die Folge ist nicht, dass Sprints scheitern — sie laufen sauber. Die Folge ist Reibung: weil keine Heimat *zuverlässig* lädt, wird der Mensch zum Trigger. Er schiebt nach: „bearbeite das Issue erst auf in_progress", „denk an den Worktree", „es gibt ein Script dafür". Jeder dieser Sätze ist der Beweis, dass ein Wissensstück am falschen Ort liegt — oder am richtigen Ort, aber nicht zuverlässig geöffnet wird.

Das Meta-Modell ordnet das. Es ist keine neue Technologie, sondern eine Disziplin: **eine Heimat je Wissensstück, und ein Mechanismus, der diese Heimat zuverlässig öffnet.**

## 2. Die Leitidee: Vorhersagbarkeit und die zwei Lasten

Der Maßstab für alles ist **Vorhersagbarkeit** — nicht dass der Agent denselben Output produziert, sondern denselben *Prozess* fährt. Ein Brainstorming soll vorhersagbar *divergieren*; ein Sprint soll vorhersagbar denselben Lebenszyklus durchlaufen.

Jede Designentscheidung zahlt dabei auf eine von zwei Lasten ein (nach Matt Pocock):

- **Context Load** — die Last des Agenten. Alles, was *immer* mitgeladen wird, kostet Tokens und Aufmerksamkeit in jedem Zug. Eine Regel, die always-on ist, ist nie umsonst.
- **Cognitive Load** — die Last des Menschen. Alles, was nur *er* auslösen kann, muss *er* im Kopf behalten. Er ist der Index.

Die ganze Kunst ist, jedes Wissensstück so zu platzieren, dass es die *richtige* Last zahlt: feste, universelle Regeln tragen Context Load (immer da, klein gehalten); seltene, menschen-entschiedene Aktionen tragen Cognitive Load (nicht immer da, dafür vom Menschen bewusst gerufen); und das mechanische Mittelfeld lädt sich *selbst*, getriggert vom Agenten.

## 3. Die drei Binding-Stufen — wie ein Stück geladen wird

| Stufe | Immer im Kontext? | Wer löst aus | Wofür |
|---|---|---|---|
| **Invariant + Router** | ja, jede Session | niemand (passiv da) | unumstößliche Regeln + Wegweiser |
| **Auto-surface** (model-invoked) | nein | der Agent (auf Triggerphrase) | mechanische, wiederholbare Prozeduren |
| **Deliberate** (user-invoked) | nein | der Mensch (tippt den Namen) | Entscheidungen, die ihm gehören |

Die alte Frage „was ist verbindlicher — SOP oder Skill?" war die falsche Frage. Text im Kontext ist gleich verbindlich. Die echte Wahl ist *auto oder deliberate* — und sie hängt am Schritt, nicht am Mechanismus. Ein Sprint durchführen ist mechanisch → auto. Einen Sprint *beenden* ist eine Entscheidung des Product Owners → deliberate. Genau deshalb bleibt `/end-session` etwas, das man bewusst tippt, und feuert nie von allein: das schützt maschinell die harte Regel, dass nur der PO einen Sprint abschließt.

## 4. Die vier Schichten — was gehört wohin

Geordnet danach, wie *nah* das Stück immer dabei sein muss:

**Tier 1 — CLAUDE.md: Leitplanken und Wegweiser, niemals Prozedur.**

Always-on, also klein. Genau zwei Inhalte: (i) **unumstößliche Regeln** („KI pusht nie ohne Version-Tag", „KI deployt nie auf NAS") und (ii) ein **Router** — die Tabelle „Triggerwort → wo finde ich was". Sobald hier Prozedur einzieht, verfettet die Datei, und der Agent muss in jeder Session 200 Regeln gleichzeitig halten. Prozedur gehört nicht hierher; sie wird *on demand* geladen. CLAUDE.md sagt nur, *wo* sie liegt.

**Tier 2 — GLOSSARY.md: das Glossar, nichts als das Glossar.**

Je Surface (backend, frontend, cli, mcp, tui) ein Glossar der Begriffe — die „ubiquitous language". „Command view" bedeutet etwas Bestimmtes in der TUI-Welt; das steht hier, implementierungsfrei. Wichtig: **keine Fundstellen, keine Locations im Glossar.** Begriffe sind stabil, Locations wandern bei jedem Refactor. Mischt man sie, churnt die stabile Datei mit. Ein `GLOSSARY-MAP.md` an der Wurzel verweist auf die einzelnen Glossare. Gepflegt wird das Netz vom aktiven `domain-modeling`-Skill, der Begriffe schärft, sobald sie sich kristallisieren.

**Tier 3 — Generische Prozedur: im Skill-Ordner, als External Reference.**

Das „wie mache ich einen Sprint mit dem DevDashboard" ist projekt-*agnostisch*. Es gilt für DD2 wie für jedes andere DD-verwaltete Projekt. Deshalb lebt es **nicht** in der DevDashboard-Datenbank (die nur eine zentrale Heimat war) und **nicht** im Repo eines einzelnen Projekts (dann existiert es nur dort), sondern als Datei im Skill-Ordner: `~/.claude/skills/run-sprint/PROCEDURE.md`. Global erreichbar aus jeder Session, git-versioniert (= Teil der Historie), und vom dünnen `/run-sprint`-Skill per Pointer geöffnet. Das ist Pococks „disclosed reference": der Skill ist das Skelett, die Prozedur das Fleisch nebenan.

**Tier 4 — Projekt-Spezifik: im Repo, in `/docs`.**

Was DD2 von anderen unterscheidet — Prefix, Ports, Git-Policy, Build-Befehle, Zeiger auf Promote-Loop und Roadmap — lebt beim Code, in `docs/sprint-project-layer.md`. Co-located, git-versioniert, frontmatter-lesbar. Der Router (Tier 1) zeigt darauf; der `/run-sprint`-Skill zieht es zur Laufzeit, sobald er aus dem Key-Prefix das Projekt abgeleitet hat.

## 5. Die zwei Achsen — und der Router als Kreuzungspunkt

Wissen ordnet sich entlang zweier *orthogonaler* Achsen, nicht einer:

- **Spatial** (Tiefe): je tiefer im Verzeichnisbaum, desto spezifischer. GLOSSARY.md und directory-CLAUDE.md folgen dem Baum. Disclosure passiert beim *Eintritt* in ein Verzeichnis — man lädt das TUI-Glossar nur, wenn man an der TUI arbeitet. Das ist die Antwort auf das 200-Regeln-Problem: nie alles, immer nur die Surface, in der man steht.
- **Topical** (Belang): manche Regeln sind nicht ortsgebunden. Die `data-ui`-Konvention, die mdx-Norm, das Design-System — sie gelten quer über Surfaces und leben in `docs/` als Concern-Dokumente.

Der **Router** (die Doku-Index-Tabelle in CLAUDE.md) ist der **Join** über beide Achsen: er zeigt sowohl auf tiefere Surfaces als auch auf topische `docs/`-Dateien. Eine `data-ui`-Frage löst sich so: die *Regel* liegt in `docs/devd2-okf/architecture/data-ui-convention.md`, der *Begriff* im Glossar, die *Fundstelle* („data-ui-Arbeit → diese Datei") im Router. Drei Dateien, jede schlank, jede mit einer Aufgabe.

## 6. Das Gedächtnis — zwei Schichten, nicht drei

Lange gab es drei Gedächtnis-Artefakte im DevDashboard: project_memory, SSTD-Slots und ein journal. Beim Nachdenken kollabiert das auf zwei, plus eine abgeleitete:

- **project_memory** — die *deduplizierte* Wissensbasis. Entscheidungen, Patterns, Lessons Learned. Das „was ist jetzt wahr und warum". Supersede-bar (eine Decision behält über Versionen ihre stabile Adresse, den Anchor), tag-bar, abfragbar. Hier — und nur hier — leben die Lessons Learned: am Issue wären sie totes, nicht abrufbares Storage; in der Memory sind sie spezifisch query-bar.
- **git history** — das *chronologische* Gedächtnis. „Was wann gemacht wurde." Es entsteht ohne Zusatzaufwand, weil die Sprint-Disziplin ohnehin einen Commit pro Issue mit Key-Referenz verlangt. `git log --grep DD2-44` ist das journal. Ein eigenes DB-journal war Doppelpflege — und war ohnehin kaputt.
- **Handover** wird nicht *gespeichert*, sondern *abgeleitet*: `/next-session-prompt` baut die Übergabe on demand aus Sprint-Kontext, Memory-Query und Meilenstein-Document. Derive, don't store.

Die SSTD-Slots in der Datenbank fielen weg, weil jeder Slot eine bessere Primärquelle duplizierte: sprint_state ist live im Sprint, roadmap im Meilenstein-Document, architecture/conventions in Memory und CLAUDE.md.

## 7. Die Entscheidungsregel — „Wohin gehört X?"

Das praktische Herz dieses Papiers. Beim nächsten Wissensstück fragt man der Reihe nach:

| Wenn das Stück…                                              | …dann gehört es nach                       | Stufe                |
| ------------------------------------------------------------ | ------------------------------------------ | -------------------- |
| eine unumstößliche, projektweite Regel ist                   | CLAUDE.md (Invariant)                      | always-on            |
| ein Wegweiser „Thema → wo finde ich es" ist                  | CLAUDE.md (Router) / GLOSSARY-MAP.md       | always-on            |
| die Definition eines Begriffs ist                            | GLOSSARY.md (Glossar der Surface)          | on-demand (Surface)  |
| eine generische, wiederholbare Prozedur ist                  | Skill-Ordner `PROCEDURE.md` + dünner Skill | auto (model-invoked) |
| eine projekt-spezifische Regel/Wert ist                      | Repo `docs/`                               | on-demand (Router)   |
| eine querschnittliche Konvention ist                         | Repo `docs/` (Concern-Doc)                 | on-demand (Router)   |
| eine getroffene Entscheidung / ein Pattern / eine Lesson ist | project_memory                             | abfragbar            |
| eine zeitliche „was-wann"-Spur ist                           | git history (Commit + Key)                 | abfragbar            |
| eine Aktion ist, die *du* (PO) bewusst auslöst               | user-invoked Skill                         | deliberate           |
| eine Übergabe an die nächste Session ist                     | `/next-session-prompt` (abgeleitet)        | deliberate           |

Zwei Faustregeln darüber: **Single Source of Truth** — jedes Stück hat genau eine autoritative Heimat; ändert sich das Verhalten, ändert man eine Stelle. Und: **was sich oft ändert, gehört dorthin, wo Churn billig ist** (Router, `/docs`), was stabil ist, dorthin, wo Stabilität zählt (Glossar, Invarianten).

## 8. Die Skill-Taxonomie — drei Ketten

Skills sind die *aktiven* Trigger über allen Schichten. Sie zerfallen in drei Ketten, jede mit der passenden Binding-Wahl:

- **Kette A — Planung** (deliberate, der Mensch steuert den Stage-Wechsel): `/brainstorm` → `/grill-me` → `writing-plans` → `/operationalize` (schreibt einen Meilenstein und n Sprints mit n Issues ins DevDashboard).
- **Kette B — Implementierung**: `/run-sprint <KEY>` (model-invoked, der Keystone — feuert auf „Bearbeite Sprint …", lädt Prozedur + Projekt-Layer + Kontext, fährt bis zur Review-Übergabe) und, davon bewusst getrennt, `/end-session` (deliberate). Die Trennung ist kein Zufall: hielte man beide zusammen, zöge das sichtbare „Sprint beenden" den Agenten dazu, den Sprint vorschnell auf fertig zu hetzen. Getrennt über eine echte Kontextgrenze bleibt jeder Schritt gründlich.
- **Kette C — Chore**: `/backlog` als eigener Skill; Aufräumen und Repo-Pflege bleiben bewusst projekt-spezifisch.

Wachsen die *deliberate* Skills über das hinaus, was man sich merken kann, kommt ein **Router-Skill** dazu: ein user-invoked Skill, der die anderen benennt — eine Heimat statt vieler im Kopf.

Die Kopplung, die das Ganze trägt: **Begriffe aus dem Glossar sind die Leitwörter in den Skill-Beschreibungen.** Lebt dasselbe Wort — „Sprint", „command view", „promote" — im Prompt, im Glossar und in der Description, dann feuert der Skill zuverlässiger. Tier 2 macht Tier 3 treffsicher.

## 9. Was stirbt

Vereinfachung heißt auch Wegnehmen. Drei Dinge gehen:

- **Der DD-DB-SOP-Layer** (`devd_sop_*`). Sein einziger Vorteil — zentral, cross-projekt erreichbar — wird vom Skill-Ordner (global, git) vollständig erfüllt. Generische Prozedur zieht dorthin, projekt-Spezifik nach `/docs`. Die Editierbarkeit in der TUI entfällt; ein Texteditor im Terminal ersetzt sie.
- **Die SSTD-Slots und das DB-journal.** Beide duplizierten Primärquellen. git ist das journal, project_memory die Wissensbasis.
- **Der `result`-Pflicht-Blocker.** Das Feld stammt aus der Zeit *vor* dem Sprint-Review und sollte eine Wissensbasis aufbauen — aber das tut die Memory. Die testbare Sicherungsschicht sind die User-Stories. Deshalb wandert das Gate: ein Issue wird nur `passed`, wenn seine User-Stories `passed` sind, und es kommt nur in einen Sprint, wenn es mindestens eine User-Story hat. Strenge bleibt, sie sitzt nur am richtigen, PO-testbaren Artefakt.

## 10. Der Kern in drei Sätzen

CLAUDE.md hält Leitplanken und Wegweiser, niemals Prozedur. Prozedur lebt on demand: generisch im Skill-Ordner, projekt-spezifisch in `/docs`, geöffnet von einem dünnen Skill, dessen Pointer-Wording über die Zuverlässigkeit entscheidet. Gedächtnis ist zweischichtig — project_memory für das *was-ist-wahr*, git für das *was-wann* —, und die Übergabe an morgen wird abgeleitet, nicht gelagert.
