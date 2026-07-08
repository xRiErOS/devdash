---
type: Glossary
title: devd2 Glossary
description: Ubiquitous-language domain terms of the devd2 OKF bundle — context-engineering meta-model, data-ui convention, roadmap board mockup, and element-list focus ring.
tags:
  - glossary
  - domain-modeling
  - devd2
  - context-engineering
timestamp: 2026-07-08T00:00:00Z
---

# Glossary

| term | definition | source-concept |
|------|------------|----------------|
| Context Load | Die Last des KI-Agenten: alles, was in jeder Session always-on mitgeladen wird und dadurch in jedem Zug Tokens und Aufmerksamkeit kostet. | architecture/context-engineering-meta-model |
| Cognitive Load | Die Last des Menschen: Wissen, das nur er auslösen kann und deshalb selbst im Kopf behalten muss — er ist der Index. | architecture/context-engineering-meta-model |
| Predictability | Wurzel-Tugend der Wissensarchitektur: nicht gleicher Output, sondern derselbe Prozess bei jedem Lauf. | architecture/context-engineering-meta-model |
| model-invoked | Binding-Stufe, bei der der Agent ein Wissensstück selbst auf eine Triggerphrase hin lädt (auto-surface); für mechanische, wiederholbare Prozeduren. | architecture/context-engineering-meta-model |
| user-invoked | Binding-Stufe, bei der der Mensch ein Stück bewusst per Namen auslöst (deliberate); für Entscheidungen, die ihm gehören, etwa den Sprint-Abschluss. | architecture/context-engineering-meta-model |
| Binding-Stufe | Eine der drei Stufen, über die ein Wissensstück in den Kontext gelangt: Invariant+Router (always-on), Auto-surface (model-invoked), Deliberate (user-invoked). | architecture/context-engineering-meta-model |
| Router | Die Trigger-zu-Fundstelle-Tabelle in der CLAUDE.md; Kreuzungspunkt (Join) der spatialen und topischen Achse, der auf tiefere Surfaces und topische docs zeigt. | architecture/context-engineering-meta-model |
| Surface | Ein Bounded Context des Projekts (backend, frontend, cli, mcp, tui) mit eigenem Glossar und eigener directory-CLAUDE.md. | architecture/context-engineering-meta-model |
| project_memory | Die deduplizierte, abfragbare Wissensbasis für Entscheidungen, Patterns und Lessons Learned — das „was ist jetzt wahr und warum", supersede- und tag-bar über einen Anchor. | architecture/context-engineering-meta-model |
| User-Story-Gate (G1/G2) | Lifecycle-Gate am PO-testbaren Artefakt: ein Issue wird nur passed, wenn alle seine User-Stories passed sind (G1), und kommt nur mit mindestens einer User-Story in einen Sprint (G2). | decisions/context-engineering-status |
| External Reference | Prozedur, die außerhalb des dünnen Skills als eigene Datei liegt und per Context Pointer geöffnet wird; das Pointer-Wording entscheidet über die Ladezuverlässigkeit. | decisions/context-engineering-status |
| data-ui | Semantisches Adressierungs-Attribut, das jeden sichtbaren UI-Knoten im Komponentenbaum eindeutig identifiziert und Spec-ID, Story-Attribut und Produktions-Code verkettet (Traceability). | architecture/data-ui-convention |
| scope | Prop, über die ein wiederverwendbarer Baustein seinen data-ui-Anker vom übergebenden Organismus erhält, statt feste Werte zu verdrahten; Sub-Anker werden als `${scope}.<element>` abgeleitet. | architecture/data-ui-convention |
| Architektur-Gate | CI-Prüfung der data-ui-Kette: findet sie eine ID als String-Literal (prod_literal), aber nicht als verdrahtetes Attribut (prod_attr), schlägt sie als ERROR an. | architecture/data-ui-convention |
| Allowlist (Ratchet-Prinzip) | Liste von IDs, die als Literal, aber noch nicht als sauberes data-ui-Attribut vorliegen; sie darf nur schrumpfen, nie wachsen, und jeder Eintrag zählt als technische Schuld. | architecture/data-ui-convention |
| RoadmapBoard | Primärer Einstiegs-Screen in die Projekt-Roadmap, der sie als Spalten-Board rendert: jeder Meilenstein eine Spalte, jeder Sprint eine Card darin. | architecture/roadmap-board-mockup-spec |
| Optimistic Updates | Interaktionsmuster: Spalten-Reorder und Card-Move werden sofort im State gespiegelt und bei einem API-Fehler zurückgerollt (Revert). | architecture/roadmap-board-mockup-spec |
| Promote-Loop | Reihenfolge, in der ein Screen aus dem Storybook-Samen entsteht: Atoms → Molecules → Organisms → Screen, presentational zuerst. | architecture/roadmap-board-mockup-spec |
| presentational | Eigenschaft eines Bauteils, das rein aus Props rendert (kein Live-Fetch, keine Hooks); der Container kapselt Datenladen und DnD und reicht die Props hinunter. | architecture/roadmap-board-mockup-spec |
| Roving-Tabindex | APG-Tastaturmuster, bei dem der Fokus (Roving-Ring) auf der jeweils aktiven Zeile liegt statt auf dem Listen-Container; genau eine sichtbare Cursor-Hervorhebung. | architecture/element-list-focus-ring |
| Cascade-Layer | CSS-Kaskaden-Schicht; eine unlayered Regel schlägt jede layered Regel unabhängig von der Spezifität — Ursache dafür, dass eine globale `*:focus-visible`-Regel die Tailwind-Utility überstimmt. | architecture/element-list-focus-ring |
