# RoadmapBoard — Mockup-Spezifikation

## Spezifikation

**Scope:** `RoadmapBoardScreen` + `RoadmapBoard` (Container) + alle untergeordneten Bausteine
**Basis für:** Storybook-Promote-Loop durch realisierenden Agent
**Stand:** 2026-06-26

---

## 1. Zweck & Verwendung

RoadmapBoard ist der primäre Einstiegspunkt in die aktuelle Roadmap eines Projekts. Es visualisiert die Roadmap als Spalten-Board: jeder Meilenstein erscheint als Spalte, Sprints erscheinen als Cards innerhalb der Spalte.

**Kern-Use-Cases:**
- Überblick: Welche Sprints gehören zu welchem Meilenstein?
- Planung: Nicht zugewiesene Sprints per Drag & Drop einem Meilenstein zuordnen.
- Priorisierung: Meilenstein-Reihenfolge per Drag & Drop anpassen (abhängigkeitsbewusst).
- Fortschritt: Wie viele Issues sind pro Sprint erledigt? (ProgressBar auf SprintCard)

**Navigation:** RoadmapBoard ist direkt via AppShell-Navigation erreichbar (Shortcut + Klick). Es ist keine Unterseite, sondern ein eigenständiger Screen mit `PageTitle`.

**Archiv-Erbe:** Das Archiv (RoadmapBoard.jsx) realisierte dieselbe Kern-Logik erfolgreich. Diese Spec übernimmt die funktionale Referenz und passt sie an den neuen Komponentenpfad (`src/ui/<tier>/`), das aktuelle Token-System und das Storybook-Promote-Pattern an.

---

## 2. Komponentenbaum

```
RoadmapBoardScreen                          [screens/]
├─ PageTitle "Roadmap"
└─ RoadmapBoard                             [organisms/complex/]
   ├─ DndContext (@dnd-kit, sensors, closestCorners)
   │  └─ BoardColumns  (horizontal-scroll container)
   │     ├─ MilestoneColumn[]               [organisms/base/]   ← sortiert nach position
   │     │  ├─ DraggableColumnWrapper       (useDraggable col:<id>)
   │     │  │  └─ MilestoneColumnHeader     [molecules/]
   │     │  │     ├─ DragHandle             [atoms/]  (grip icon)
   │     │  │     ├─ EntityId               [atoms/]  (Milestone-ID)
   │     │  │     ├─ Milestone-Name         (Typografie-Slot)
   │     │  │     └─ Milestone-Goal         (subtext, gekürzt)
   │     │  ├─ DroppableColumnBody          (useDroppable drop:<id>)
   │     │  │  ├─ SprintCard[]              [organisms/base/]  ← aktive Sprints
   │     │  │  │  └─ DraggableCardWrapper   (useDraggable card:<id>)
   │     │  │  └─ CompletedSprintList       (read-only, Fuß der Spalte)
   │     │  │     └─ CompletedSprintCard[]  [organisms/base/]  ← reduzierte Variante
   │     │  └─ ColumnDropIndicator          (dezente Linie zwischen Spalten, nur bei Drag)
   │     └─ UnassignedColumn                [organisms/base/]   ← rechtes Ende
   │        ├─ UnassignedColumnHeader       [molecules/]
   │        └─ DroppableColumnBody          (useDroppable drop:null)
   │           └─ SprintCard[]              (nicht zugewiesene Sprints)
   ├─ DragOverlay (@dnd-kit)
   │  ├─ SprintCard-Ghost    (bei card-Drag)
   │  └─ ColumnNamePill      (bei col-Drag)
   └─ EmptyState             [atoms/]       (wenn kein Meilenstein vorhanden)
```

**Hinweis zu Live-Wrappern:** `MilestoneColumn` und `UnassignedColumn` sind präsentational (Props-only). Der `RoadmapBoard`-Container kapselt alle Hooks (`useDraggable`, `useDroppable`) und reicht die resultierenden Props per Render-Pattern (cloneElement oder explizite Props) nach unten durch.

---

## 3. Layout

### 3.1 Gesamtlayout

```
┌─ RoadmapBoardScreen ──────────────────────────────────────────┐
│  PageTitle: "Roadmap"                                          │
│                                                                │
│  ┌─ BoardColumns (horizontal scroll, snap) ─────────────────┐ │
│  │                                                           │ │
│  │  ┌─ MilestoneColumn ─┐  ┌─ MilestoneColumn ─┐  ┌─ Un- ┐│ │
│  │  │ [Header: M1]      │  │ [Header: M2]       │  │ ass- ││ │
│  │  │ ─────────────────  │  │ ─────────────────  │  │ ign- ││ │
│  │  │ [SprintCard]      │  │ [SprintCard]       │  │ ed]  ││ │
│  │  │ [SprintCard]      │  │ [SprintCard]       │  │      ││ │
│  │  │ [SprintCard]      │  │                    │  │ [S]  ││ │
│  │  │ ─── Completed ─── │  │ ─── Completed ─── │  │ [S]  ││ │
│  │  │ [CompletedCard]   │  │ [CompletedCard]    │  │ [S]  ││ │
│  │  └───────────────────┘  └───────────────────┘  └──────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Spalten

- **Breite:** feste Spaltenbreite `w-72` (288px); keine Flex-Expansion
- **Höhe:** `min-h-[620px]`, kein max (scrollt vertikal pro Spalte intern)
- **Scroll:** horizontaler Scroll auf `BoardColumns`, kein Wrap
- **MilestoneColumn:** `bg-[--layer-2]`, Border `border border-[--surface0]`, `rounded-lg`
- **UnassignedColumn:** optisch abgesetzt — `bg-[--layer-3]` + `border-dashed border-[--surface1]` + `rounded-lg`; (Q03 — final PO-Entscheidung)

### 3.3 Drop-Indikator

Beim Ziehen einer MilestoneColumn erscheint zwischen den Nachbar-Spalten eine `2px`-Linie in `--accent-info`. Kein Shadow, kein glow. Die Linie ist absolut positioniert, `h-full` der BoardColumns-Reihe.

### 3.4 Completed-Sektion

Am Fuß jeder MilestoneColumn, getrennt durch `border-t border-[--surface1]` + `pt-2`:
- Sektionsüberschrift: `text-xs text-[--subtext0] uppercase tracking-wide` — "Abgeschlossen"
- Collapsed by default, toggle via IconButton (Chevron) — (Q06 PO-Entscheidung, vorerst ungefält)

---

## 4. Komponentenlogik

### 4.1 RoadmapBoard (Container)

| Verantwortung | Detail |
|---|---|
| Datenladen | `useEffect` bei mount + Projektwechsel |
| DnD-Orchestrierung | Einziger `DndContext`; dispatcht an `roadmapBoardDnd.js` |
| Optimistic Updates | Spalten-Reorder und Card-Move sofort im State; Revert bei API-Fehler |
| Abhängigkeits-Check | vor Spalten-Drop: `validateColumnReorder(deps, newOrder)` — blockiert Drop wenn Dep verletzt |
| Re-Fetch-Trigger | `devd-backlog-changed`-Window-Event |

### 4.2 MilestoneColumn

Rein präsentational. Props:
```
milestone: { id, name, goal, position }
sprints: Sprint[]          ← aktive (non-completed) Sprints
completedSprints: Sprint[] ← abgeschlossene Sprints
dragHandleProps: object    ← von Container injiziert
droppableProps: object     ← von Container injiziert
isOver: boolean            ← Drop-Highlight
```

### 4.3 UnassignedColumn

Analog MilestoneColumn, aber kein DragHandle (nicht verschiebbar), kein CompletedSprint-Bereich.

### 4.4 SprintCard (aktive Variante)

Props:
```
sprint: {
  id, name, status,
  issue_done: number, issue_total: number
}
dragHandleProps: object  ← von Container injiziert
onOpen: () => void       ← Navigation zu Sprint-Detail
```

- DragHandle ist **einziger** initialer Drag-Trigger (verhindert Konflikt mit onOpen)
- ProgressBar zeigt `issue_done / issue_total` (dichotom: grau/grün)

### 4.5 CompletedSprintCard (reduzierte Variante)

- Kein DragHandle (nicht draggable)
- Kein ProgressBar (implizit fertig)
- Kompaktere Höhe: `py-1 px-2` statt `py-2 px-3`
- Text und Icons: `text-[--subtext0]`, muted-Tönung
- Shows: EntityId + SprintName (einzeilig, truncate)

### 4.6 roadmapBoardDnd.js (reine Mathe)

Exportiert (stateless pure functions):
```js
colDragId(milestoneId)        → "col:<id>"
cardDragId(sprintId)          → "card:<id>"
colDropId(milestoneId | null) → "drop:<id>" | "drop:null"
parseDragId(id)               → { type: 'col'|'card', id: number }
computeColumnReorder(cols, activeId, overId) → number[]  (ordered_ids)
validateColumnReorder(deps, orderedIds)      → boolean   (true = valid)
applyColumnReorder(cols, orderedIds)         → MilestoneColumn[]
computeCardMove(cards, activeId, overId, targetColId) → { milestone_id, position }
```

### 4.7 dndSensors.js

`useTouchDndSensors()` — PointerSensor + KeyboardSensor. Kein Mobile-Long-Press (Desktop-first in DD2). Später erweiterbar.

---

## 5. States

| State | Typ | Zweck |
|---|---|---|
| `milestones` | `Milestone[]` | Geladene Meilensteine inkl. `position` |
| `sprints` | `Sprint[]` | Alle Sprints des Projekts (inkl. `milestone_id`, `issue_done`, `issue_total`, `status`) |
| `milestoneDeps` | `Dep[]` | `{ id, predecessor_id, successor_id }[]` — für Reorder-Validierung |
| `loading` | `boolean` | Lade-Gate (zeigt Skeleton) |
| `activeDrag` | `DragItem \| null` | Gezogenes Element für DragOverlay |
| `overId` | `string \| null` | Aktuelles Drop-Ziel (Drop-Indikator-Linie) |

**Abgeleitet (kein State, `useMemo`):**
- `orderedMilestones` — `milestones` nach `position` sortiert
- `sprintsByMilestone` — Map `milestone_id → Sprint[]` (nur aktive)
- `completedByMilestone` — Map `milestone_id → Sprint[]` (status `done`/`cancelled`)
- `unassignedSprints` — Sprints ohne `milestone_id`

---

## 6. Aktionen und Interaktionen

| # | Interaktion | Trigger | Backend-Call | Verhalten |
|---|---|---|---|---|
| A1 | Initial-Load | mount | `GET /api/milestones?status=all` · `GET /api/sprints` · `GET /api/milestones/:id/dependencies` (fan-out) | Parallel; Skeleton bis fertig |
| A2 | Spalten-Reorder | DragEnd col-Drag | `PATCH /api/milestones/reorder` `{ ordered_ids }` | Optimistic; Revert bei Error; vor Drop: `validateColumnReorder` — bei Verletzung Drop blockieren (Q02) |
| A3 | Card-Move (Sprint → Milestone) | DragEnd card-Drag | `PUT /api/sprints/:id` `{ milestone_id, position }` | Optimistic; Revert bei Error |
| A4 | Card-Move → Unassigned | DragEnd card-Drag auf UnassignedColumn | `PUT /api/sprints/:id` `{ milestone_id: null }` | Analog A3 |
| A5 | Sprint-Navigation | Klick auf SprintCard (außer DragHandle) | — | Router-Push `/sprints/:id` |
| A6 | Re-Fetch | `devd-backlog-changed`-Event | A1 wiederholen | vollständiger Re-Load |

**MSW-Handler (für Storybook):**
```
GET  /api/milestones           → fixtures/milestone-list.json
GET  /api/milestones/:id/dependencies → fixtures/milestone-deps.json
GET  /api/sprints              → fixtures/sprint-list.json
PATCH /api/milestones/reorder  → 200 OK (Echo)
PUT  /api/sprints/:id          → 200 OK (Echo)
```

**Gap-Analyse:** Noch nicht durchgeführt — per Constraint Mockup-First. Nach Implementierung prüfen ob `GET /api/milestones` das Feld `goal` enthält; ggf. `GET /api/milestones/:id` fan-out analog zu DoD.

---

## 7. Accessibility & Keyboard

| Element | ARIA / Verhalten |
|---|---|
| BoardColumns | `role="region"` `aria-label="Roadmap"` |
| MilestoneColumn | `role="group"` `aria-label="{milestone.name}"` |
| DragHandle (Spalte) | `aria-label="Meilenstein {name} verschieben"` `tabIndex={0}` — KeyboardSensor übernimmt |
| DragHandle (Card) | `aria-label="Sprint {name} verschieben"` `tabIndex={0}` |
| SprintCard | `role="article"` `aria-label="Sprint {id}: {name}"` |
| ProgressBar | `role="progressbar"` `aria-valuenow={done}` `aria-valuemax={total}` `aria-label="Fortschritt"` |
| Drop-Indikator | `aria-hidden="true"` (rein visuell) |
| EmptyState | `role="status"` `aria-live="polite"` |

**Keyboard-Navigation:**
- `Tab` fokussiert DragHandles in DOM-Reihenfolge
- `Space` / `Enter` auf DragHandle: startet Keyboard-Drag (@dnd-kit KeyboardSensor)
- Pfeiltasten: bewegen das Drag-Element (nächste/vorherige Spalte / Card-Position)
- `Space` / `Enter`: Drop bestätigen; `Escape`: Drag abbrechen
- `Tab` auf SprintCard-Body (außer Handle): fokussiert Card für Klick-Navigation

---

## 8. Storybook-Story-Plan

Stories werden präsentational realisiert (kein Live-Fetch, Daten via `args` / MSW). Reihenfolge folgt dem Promote-Loop (Atoms → Molecules → Organisms → Screen).

| Datei | Tier | Title (SB-nav) | Story-Varianten | Status |
|---|---|---|---|---|
| `atoms/ProgressBar.stories.jsx` | atoms | `Atoms/ProgressBar` | `Empty` · `Half` · `Full` · `AllCancelled` | open |
| `atoms/DragHandle.stories.jsx` | atoms | `Atoms/DragHandle` | `Default` · `Disabled` | open |
| `molecules/MilestoneColumnHeader.stories.jsx` | molecules | `Molecules/MilestoneColumnHeader` | `Default` · `LongName` · `DraggingState` | open |
| `molecules/UnassignedColumnHeader.stories.jsx` | molecules | `Molecules/UnassignedColumnHeader` | `Empty` · `WithCount` | open |
| `organisms/base/SprintCard.stories.jsx` | organisms/base | `Organisms/SprintCard` | `Active` · `Review` · `Dragging` · `Completed` | open |
| `organisms/base/MilestoneColumn.stories.jsx` | organisms/base | `Organisms/MilestoneColumn` | `WithSprints` · `Empty` · `WithCompleted` · `IsOver` | open |
| `organisms/base/UnassignedColumn.stories.jsx` | organisms/base | `Organisms/UnassignedColumn` | `WithSprints` · `Empty` · `IsOver` | open |
| `organisms/complex/RoadmapBoard.stories.jsx` | organisms/complex | `Organisms/RoadmapBoard` | `Default` (MSW) · `Empty` · `Loading` · `DragActive` (args) | open |
| `screens/RoadmapBoardScreen.stories.jsx` | screens | `Screens/RoadmapBoardScreen` | `Default` (MSW) · `Empty` | open |

**MSW-Fixtures benötigt:**
- `src/ui/foundations/fixtures/milestone-list.json` — Array mit 3 Meilensteinen
- `src/ui/foundations/fixtures/milestone-deps.json` — 1 Abhängigkeit (M1 → M2)
- `src/ui/foundations/fixtures/sprint-list.json` — bereits vorhanden, ggf. um `milestone_id` + `issue_done/total` erweitern

---

## 9. Komponentenübersicht

### Vorhanden (wiederverwendbar, kein Anpassungsbedarf)

| Bauteil | Pfad | Verwendung im RoadmapBoard |
|---|---|---|
| `Button` | `atoms/Button.jsx` | Ggf. Retry-Aktion im Error-State |
| `EmptyState` | `atoms/EmptyState.jsx` | Kein Meilenstein vorhanden |
| `EntityId` | `atoms/EntityId.jsx` | Meilenstein-ID + Sprint-ID-Anzeige |
| `IconButton` | `atoms/IconButton.jsx` | Completed-Toggle (Chevron), ggf. DragHandle |
| `Chip` | `atoms/Chip.jsx` | Ggf. Status-Label in SprintCard |
| `StatusDot` | `atoms/StatusDot.jsx` | Sprint-Status-Anzeige in SprintCard |
| CSS `.milestone-tile*` | `src/index.css` | Basis-Styling für MilestoneColumn (bereits vorhanden) |

### Neu zu erstellen

| Bauteil | Ziel-Pfad | Beschreibung |
|---|---|---|
| `ProgressBar` | `atoms/ProgressBar.jsx` | Dichotom-Fortschrittsbalken: `value/total`; grau = offen, grün = erledigt |
| `DragHandle` | `atoms/DragHandle.jsx` | Grip-Icon-Button; `aria-label` via Prop; `cursor-grab` / `cursor-grabbing` |
| `MilestoneColumnHeader` | `molecules/MilestoneColumnHeader.jsx` | EntityId + Name + Goal + DragHandle; presentational |
| `UnassignedColumnHeader` | `molecules/UnassignedColumnHeader.jsx` | Titel "Nicht zugeordnet" + Sprint-Count-Chip |
| `SprintCard` | `organisms/base/SprintCard.jsx` | EntityId + StatusDot + Name + ProgressBar + DragHandle; zwei Varianten: `active` / `completed` |
| `MilestoneColumn` | `organisms/base/MilestoneColumn.jsx` | MilestoneColumnHeader + SprintCard-Liste + CompletedSprintList; presentational |
| `UnassignedColumn` | `organisms/base/UnassignedColumn.jsx` | UnassignedColumnHeader + SprintCard-Liste; anders gestaltete Spalte |
| `RoadmapBoard` | `organisms/complex/RoadmapBoard.jsx` | Container: Daten laden, DnD-Kontext, Optimistic Updates |
| `RoadmapBoardScreen` | `screens/RoadmapBoardScreen.jsx` | PageTitle + RoadmapBoard |
| `roadmapBoardDnd.js` | `src/lib/roadmapBoardDnd.js` | Pure DnD-Mathe (kein React) |
| `dndSensors.js` | `src/lib/dndSensors.js` | `useTouchDndSensors()` Hook |

---

## 10. Offene Fragen

| # | Frage | Kontext | Auswirkung |
|---|---|---|---|
| Q01 | Gilt `cancelled` als "erledigt" (grün) in der ProgressBar? | PO-Briefing nennt "fertig / storniert = grün". Storniert ist kein positiver Abschluss. | ProgressBar-Logik: `issue_done` zählt nur done, oder done+cancelled? |
| Q02 | Feedback bei blockiertem Spalten-Reorder (Abhängigkeitsverletzung)? | Drop wird verhindert — aber wie kommunizieren? Silent-Block, Toast, Shake-Animation, Tooltip? | UX-Konsequenz; Toast = zusätzliches Atom |
| Q03 | Styling UnassignedColumn: nur Border-Stil (gestrichelt) oder auch andere Hintergrundfarbe? | PO: "anders gestaltet". Vorerst `bg-[--layer-3]` + `border-dashed` angenommen. | Visuelle Differenzierung zum Meilenstein-Bereich |
| Q04 | Completed-Sektion: Initial eingeklappt (Toggle) oder immer sichtbar? | PO-Briefing impliziert "am Fuß" — offen ob collapsed. | Zustand-Komplexität; Toggle braucht State pro Spalte |
| Q05 | Klick auf SprintCard navigiert zu Sprint-Detail — Route? | Annahme: `/sprints/:id`. Bestätigung nötig. | Routing-Verdrahtung in RoadmapBoardScreen |
| Q06 | Welche Sprint-Status gelten als "aktiv" (sichtbar in Column-Body)? | Annahme: `planning` · `active` · `review`. `done`/`cancelled` → CompletedList. | Filterbedingung in `sprintsByMilestone` |
| Q07 | Soll die Abhängigkeitskette (M1→M2) auf dem MilestoneColumnHeader visuell dargestellt werden? | PO-Briefing erwähnt Abhängigkeiten, aber keine Visualisierung auf dem Header. | Ggf. kleines Dep-Badge oder Pfeil-Icon |

---

## 11. Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D01 | DnD-Bibliothek: `@dnd-kit` | Archiv-Vorlage hat sich bewährt; kein Neu-Evaluation |
| D02 | Optimistic Updates + Revert-Pattern | Responsivität; Revert verhindert Daten-Inkonsistenz bei API-Fehler |
| D03 | CSS `.milestone-tile*` aus index.css beibehalten | Bereits vorhanden; MilestoneColumnHeader nutzt diese Klassen als Base-Layer |
| D04 | `SprintCard` hat zwei Varianten (`active` / `completed`) statt zwei Komponenten | Eine Quelle, ein Story, kein Drift |
| D05 | UnassignedColumn rechts (nicht links) | PO-Briefing: "Am rechten Ende" — widerspricht Archiv (links), PO hat Vorrang |
| D06 | Dependency-Validierung client-seitig via `validateColumnReorder` | Backend validiert erst bei `PATCH /api/milestones/reorder`; client-seitige Prüfung verhindert ungültige Drops ohne Server-Round-Trip |
| D07 | `RoadmapBoard` = `organisms/complex/` (mit MSW-Story) | Lädt echte Daten via Hooks — fällt nicht unter `organisms/base/` (präsentational) |
| D08 | Gap-Analyse nach Mockup | Constraint aus PO-Briefing: Entwurf > Gap-Analyse > Backend-Anpassungen |
