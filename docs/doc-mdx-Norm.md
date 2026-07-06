---
type:
description: docs.mdx-Norm — verbindliche Struktur der per-Story-Dokumentation (Storybook-Insel)
tags: [delete]
aliases: []
relates_to:
uid: 4f4c80e2-6143-49c1-add2-801361fb2404
source: Claude-Code-Session 2026-06-24 (grill-me D01–D09), Clean-Cut-Slim 2026-06-25
title: doc-mdx-Norm
---

# docs.mdx-Norm

Die `.mdx` je Story ist **DIE Narrativ-Quelle der Komponente** — Zweck, Verwendung,

Zustände, Abgrenzung. Sie ist die einzige Wahrheit für das, was Code nicht ausdrückt

(Warum, Wann/Wann-nicht, a11y-Begründung). **Code-Fakten zieht sie LIVE, tippt sie NIE ab.**

**Pflicht:** VOR Arbeit an einer Story die `.mdx` lesen, NACH jeder Änderung nachziehen.

Veraltete/fehlende `.mdx` = Komponente unvollständig. Konvention scharf in

`apps/frontend/src/storybook/CLAUDE.md` — diese Datei liefert nur das Sektions-Template.

Template (Kopiervorlage): `docs/doc-mdx-Norm-Template.mdx`. Gutes Ist-Muster: `TagChip.mdx`.

## Schicht-Schnitt — eine Wahrheit pro Art (hart)

| Wahrheits-Art | Ort | MDX-Rolle |
|---|---|---|
| Props / Enums / Defaults | Story `argTypes` | **zieht live** `<ArgTypes of={…}>` / `<Controls of={…}>` |
| Render / Beispiel | die Story selbst | **bindet live** `<Canvas of={Stories.X}>` |
| Status | `meta.tags` | inline-Textzeile, **nicht** zweitgepflegt |
| Tokens | `src/index.css` | nur referenzieren |
| Verhalten/Logik | Test | beschreiben + verweisen |
| **Zweck / Wann / Warum / a11y-Begründung** | **NUR die `.mdx`** | **hier IST die `.mdx` einzige Wahrheit** |

**0-Duplikat-Regel:** Keine hand-getippte Prop-/Varianten-Tabelle in der `.mdx`. Was der

Code besitzt → `<ArgTypes/>`/`<Canvas of>` oder Link. Abgetippte Code-Fakten driften = verboten.

## Pflicht-Sektionen

Immer: **Kurzbeschreibung · Zweck · Wann verwenden (Ja/Nein) · Props (live) · Zustände**.

- Kurzbeschreibung: 1–3 Sätze — was, wofür.
- Zweck: Rolle der Komponente, Komposition (welche Atome/Molecules), Dumb/Smart.
- Wann verwenden: **Ja**-Fälle + **Nein**-Fälle mit Verweis auf die richtige Alternative.
- Props: `<ArgTypes of={Stories}>` — live, kein Text-Table.
- Zustände: Achsen/`State_`-Stories beschreiben + `<Canvas of={Stories.X}>` einbinden.

## Bedingte Sektionen (nur wenn zutreffend, sonst GANZ weglassen)

- **Barrierefreiheit** (nur interaktiv): ARIA-Rollen + Keyboard — beschreiben, Prüf-Logik nicht duplizieren.
- **Beispiele** (zusätzliche `<Canvas of>` über Default hinaus).
- **Prop-Details** (nur komplexe Typen/Enums über `<ArgTypes>` hinaus).

## Screen-Drafts (`08-*`)

Basis-Norm + **Aktueller Stand**: je Region/Komponente Beschreibung + Wiring-Stand

(`verdrahtet | offen | net-new`). Snapshot was promoted/offen ist — kein Contract/Briefing/Gap-Chain.

## Was raus ist (Clean-Cut 2026-06-25)

Kein `gen-composition`/AUTOGEN-Drift-Gate, kein `Status.jsx`/`Composition.jsx`-Auto-Block,

kein C4-/Contract-/Briefing-/Gap-Verweis, keine Checklist-Wikilinks, kein Mockup-Room.

Alignment kommt aus **live-pull** (Story = Quelle), nicht aus Generatoren/Gates.

## Netz

Statischer MDX-Link-Check (`tests/frontend-mdx-link/`): jede `.mdx` hat eine Sibling-Story,

jeder `of={Stories.X}`-Verweis löst auf, kein toter Helfer-Import. Story-↔-MDX-Vollständigkeit

wird erst nach dem PO-Review-Slim scharf (jetzt nur gelistet).
