---
type:
description: Container-Focus-Ring der Element-List (Loesungsskizze/Briefing)
tags: []
aliases: []
relates_to:
uid: 8a4b3b51-18e4-4c3e-a74c-aee9f3587042
title: Briefing ElementList Focus-Ring
---

# Briefing — ElementList Container-Focus-Ring (Lösungsexperte)

**Datum:** 2026-06-26 · **Projekt:** DD2 (`apps/frontend`) · **Severity:** B (medium, UX)

**Auftrag:** Den doppelten/falschen Focus-Ring am ElementBrowser endgültig beseitigen —

sauber, tokentreu, ohne neue Regressionskette. Bisherige Versuche unten, NICHT wiederholen.

## 1. Sollzustand (was korrekt ist)

ElementBrowser-Liste = APG-Tree mit Keyboard-Steuerung:

- **Genau eine** sichtbare Hervorhebung als Tastatur-Cursor: der Roving-Ring auf der
  aktiven Zeile (`ElementRow` `focused` → `ring-2 ring-[var(--accent-primary)] ring-inset`).
- Preview-Ziel (angeklickte Zeile mit offenem Detail) = grauer Hintergrund
  (`bg-[var(--state-active)]`) — ein anderes, legitimes Signal, darf gleichzeitig sichtbar sein.
- Der **Listen-Container selbst** (`organism.elementList`, `role="tree"`, `tabIndex=0`)
  darf KEINEN sichtbaren Focus-Ring zeigen — er ist nur das DOM-Fokus-Ziel, das per
  `aria-activedescendant` auf die aktive Zeile verweist.

## 2. Symptom (Ist)

Der Container `organism.elementList` bekommt einen **peach-farbenen Outline-Rahmen um die

ganze Liste**, sobald er den Tastaturfokus hat (Pfeilnavigation oder programmatischer

`.focus()` nach Maus-Klick + danach Pfeildruck). Damit sind zwei Rahmen sichtbar:

Container-Rahmen + Zeilen-Roving-Ring.

## 3. Reproduktion

Storybook `05 SCREENS/ElementBrowser` → Story `Interactive` oder `NestedMixed`:

1. In die Liste tabben oder eine Zeile klicken.
2. Pfeil ↓/↑ drücken.
3. → Peach-Outline umrahmt den gesamten `organism.elementList`-Container.

## 4. Root Cause (belegt)

`apps/frontend/src/index.css:337-343` — **unlayered** globale Regel:

```css
*:focus-visible {
  outline: 2px solid var(--peach);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Diese Regel steht NACH `@import "tailwindcss";` (Zeile 5) und liegt damit **außerhalb

aller `@layer`**. In Tailwind v4 hängen alle Utilities in `@layer utilities`. Nach den

CSS-Cascade-Layer-Regeln schlägt **unlayered immer layered** — unabhängig von Spezifität.

Eine Tailwind-Utility (`focus-visible:outline-none`, in `@layer utilities`) kann die Regel

also nicht per Spezifität überstimmen.

`!important` würde sie schlagen (important > normal, layerübergreifend) — aber der aktuell

gesetzte Versuch `focus-visible:[outline:none!important]` erzeugt in Tailwind v4

vermutlich keine valide/wirksame Deklaration (Important-in-Arbitrary-Value-Syntax). Das ist

zu verifizieren (kompiliertes CSS inspizieren), gilt aber als wahrscheinlichste Erklärung,

warum der Ring trotz der Klasse zurück ist.

Der Container ist das einzige Element, das diesen Treffer zeigt, weil er das einzige

keyboard-fokussierte Element der Liste ist (Zeilen-Controls sind `tabIndex=-1`,

Roving läuft über `aria-activedescendant`, nicht über echten Zeilenfokus).

## 5. Architektur (relevante Dateien)

| Datei | Rolle |
|---|---|
| `ui/organisms/base/ElementList.jsx` | Container `role="tree"`, `tabIndex=0`, `aria-activedescendant`, `onKeyDown/onFocus`, hält `ref={nav.containerRef}`. Aktuelle Klasse enthält `focus-visible:[outline:none!important]` (wirkungslos). |
| `ui/organisms/base/useListNavigation.js` | Hook: Roving-State (`focusIndex`/`anchorRef`), `containerRef`, `focusRow(id)` (Maus-Klick → Cursor setzen + Container fokussieren), `onKeyDown` (Pfeil/Shift+Pfeil/Enter/Space). |
| `ui/organisms/base/listNavigation.js` | Pure Index-Mathematik (`flattenVisible/clampIndex/rangeIds`), node-getestet (`tests/elementbrowser-keyboard/`, 13/13). |
| `ui/molecules/ElementRow.jsx` | Zeile: `focused` → Roving-Ring, `tabbable={false}` → innere Controls `tabIndex=-1`, `id` = aria-activedescendant-Ziel, `active` → grauer BG. |
| `index.css:337` | Globale unlayered `*:focus-visible`-Peach-Outline (DD-97). Der Verursacher. |

## 6. Constraints (hart, aus `apps/frontend/CLAUDE.md`)

- **0 inline `style={{}}`, 0 Roh-Hex.** Nur Token (`var(--token)`)/Tailwind-Klassen.
- Tailwind v4 (`@import "tailwindcss"`), Catppuccin. Token-Master = `index.css`.
- Icons nur via Registry. Kein Emoji.
- Einziges Frontend-Netz: Render-Smoke (`tests/frontend-render-smoke/`, 142/142 muss grün bleiben).
- `index.css` ist editierbar (Token-Master), aber Änderungen an der globalen `*:focus-visible`-
  Regel (DD-97) sind security-/a11y-neutral zu halten: der Peach-Outline für ECHTE
  Tab-Navigation auf anderen Komponenten darf nicht verschwinden.

## 7. Bisherige Lösungsversuche (chronologisch — NICHT wiederholen)

| # | Versuch | Ergebnis |
|---|---|---|
| V1 | Container `focus-visible:ring-1 ring-[var(--border-elevated)]` als bewusster Ring | Falsch verstanden — erzeugte gewollten, aber unerwünschten Ring. Entfernt. |
| V2 | Container nur `outline-none` (zustandslos) | Verliert gegen `*:focus-visible` (Pseudo-Klasse höhere Spezifität + unlayered). Ring blieb. |
| V3 | Container `outline-none focus-visible:outline-none` | Layered Utility verliert gegen unlayered global. Ring blieb. |
| V4 | Container `focus-visible:[outline:none!important]` | Aktuell gesetzt. Ring zurück → Important-Arbitrary-Syntax greift offenbar nicht in v4. **Status quo.** |
| V5 | Innere Buttons (caret/body/checkbox) `focus-visible:outline-none` | Half gegen einen ANDEREN Bug (Maus-Klick-Fokus auf innerem Button → Peach beim nächsten Pfeil). Inzwischen besser über `focusRow()` gelöst → diese toten Klassen wurden zurückgenommen. |
| V6 | `focusRow(id)`: Maus-Klick zieht DOM-Fokus auf Container + setzt Cursor | Behob den inneren-Button-Doppelring. Brachte aber den Container-Ring wieder zum Vorschein (Container ist jetzt zuverlässig fokussiert). = aktueller Stand. |

## 8. Lösungsrichtungen für den Experten (Empfehlung zuerst)

### Option A (empfohlen) — Roving-Tabindex statt aria-activedescendant

Echten Fokus auf die aktive Zeile legen statt auf den Container:

- Container bekommt KEIN `tabIndex` (nicht mehr fokussierbar) → kein Container-Ring möglich.
- Aktive Zeile: `tabIndex = focused ? 0 : -1`; `onKeyDown` bleibt am Container (bubbelt).
  `useListNavigation` hält `rowRefs[]` und ruft `rowRefs[focusIndex].focus()`.
- Die fokussierte `ElementRow` (Root `role="treeitem"`) bekommt dann via globaler Regel den
  Peach-Outline NATÜRLICH = könnte den manuellen `ring-2 accent-primary` sogar ersetzen
  (Design-Entscheidung: Peach = projektweite Tab-Affordanz, konsistenter).
- Vorteil: beendet den gesamten Override-Krieg, ist das APG-Standardmuster, ein einzelner
  Tab betritt/verlässt die Liste sauber. Aufwand: mittel (Hook + Row-Refs).
- **Offene D-Frage `D01`:** Roving-Indikator = Peach-Outline (global) ODER der bestehende
  `accent-primary`-Ring? (Konsistenz vs. bestehende Optik.)

### Option B (schnell) — scoped unlayered Override in index.css

Direkt nach Zeile 358 eine ebenfalls unlayerte, spezifischere Regel ergänzen:

```css
[role="tree"]:focus-visible { outline: none; }
```

Gleiche (unlayered) Ebene, höhere Spezifität + spätere Quellreihenfolge → gewinnt sauber

ohne `!important`. Tokentreu (keine Farbe/Hex). Container-spezifisch, kein Kollateral.

Nachteil: leichter Selektor-Smell (Komponentenwissen im globalen Token-File); a11y prüfen

(Container hat dann gar keine sichtbare Fokus-Affordanz — akzeptabel, weil der Roving-Ring

auf der Zeile die Affordanz trägt).

### Option C — korrekte v4-Important-Syntax verifizieren

Falls man bei der Utility bleiben will: kompiliertes CSS prüfen und die wirksame v4-Form

finden (z.B. `focus-visible:outline-hidden` bzw. korrektes Important-Modifier-Suffix). Nur

als Fallback — adressiert das Layer-Grundproblem nicht konzeptionell.

## 9. Verifikation (Definition of Done)

1. Story `Interactive` + `NestedMixed`: Pfeilnavigation zeigt **nur** den Zeilen-Ring,
   KEINEN Container-Rahmen.
2. Maus-Klick auf Zeile → grauer BG (Preview) + Cursor folgt; danach Pfeil → nur Zeilen-Ring.
3. Echte Tab-Navigation auf anderen Komponenten behält ihren Peach-Outline (DD-97 intakt).
4. `npm test` Render-Smoke 142/142 grün; `gen:composition:check` kein Drift.
5. Keine inline-styles/Roh-Hex (`grep` sauber).
