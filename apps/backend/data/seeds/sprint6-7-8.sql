-- Sprint 6/7/8 Seed — UI-Refactor (Layout, Visual, Components)
-- 3 Sprints (planning) + 17 Stories (refined) für Project 2 (DevD).

BEGIN TRANSACTION;

-- Sprints
INSERT INTO sprints (project_id, name, status, notes, position) VALUES
  (2, 'Sprint 6 — App-Shell & Navigation',
   'planning',
   'Layout-Foundation: 3-Spalten-App-Shell mit linker Nav-Sidebar (Icon-only), mittigem Hauptinhalt und collapsible rechter Detail-Sidebar. ItemDetail wandert als Slide-Over in die rechte Sidebar — kein Page-Wechsel mehr. Cards in Listen werden durch horizontale Trenner ersetzt. Vorbild: Vibe-Kanban + GitLab.',
   100),
  (2, 'Sprint 7 — Visual Refinement (Color, Type, Density)',
   'planning',
   'Auf der neuen App-Shell: Akzentfarben drastisch reduzieren (1 Primary + 4 semantische), JetBrains Mono als Display-Font für Headings, Spacing-Tokens auf 4 px-Grid, Tag-Farben auf 6 begrenzen. Issue-Cards bekommen Lucide-Icons statt Type-Pillen und Border-Left für Priority.',
   101),
  (2, 'Sprint 8 — Component-Library',
   'planning',
   'Wiederverwendbare Bausteine: Custom-Select (statt native HTML), Pill/IconButton/SegmentedControl/EmptyState/StickyActionBar, konsistentes Lucide-Icon-Set, Filter-Popover-Component. Sammelt Patterns, die in Sprint 6+7 mehrfach improvisiert wurden.',
   102);

-- Sprint-IDs ermitteln (assumption: AUTOINCREMENT, last 3 inserts)
-- Wir referenzieren über (SELECT id FROM sprints WHERE name = '...')

-- ============================================================
-- Sprint 6 — App-Shell & Navigation (5 Stories: DD-42..46)
-- ============================================================

INSERT INTO backlog (project_id, project_number, title, type, status, priority, goal, background, context_notes, assigned_sprint)
VALUES
  (2, 42, 'App-Shell mit Left-Nav-Sidebar + collapsible Right-Sidebar', 'feature', 'refined', 1,
   'Drei-Spalten-Layout etablieren: schmale Icon-Sidebar links (~56-64 px), Hauptinhalt mittig, collapsible Detail-Sidebar rechts (~360-440 px). Ersetzt die aktuelle horizontale Top-Bar in Layout.jsx.',
   'Vorbild Vibe-Kanban und GitLab. Aktueller Layout-Header verbraucht vertikalen Platz, beherbergt aber zu viele unterschiedliche Aktionen (Logo, Roadmap, Project-Switcher, Search, Trash, Settings, Theme). Eine Icon-only Sidebar links macht das aufgeräumter und gewinnt vertical space für den Hauptinhalt zurück.',
   'Linke Sidebar enthält: DevD-Logo (oben), Roadmap, Project-Switcher (kleiner Avatar), Trash, Settings; Theme-Toggle am unteren Rand (mt-auto). Hauptinhalt-Container nimmt verbleibende Breite. Rechte Sidebar default collapsed (width 0), wird sichtbar wenn ein Issue/Sprint ausgewählt ist (siehe DD-43). Layout.jsx wird grundlegend umgebaut. Mobile (<lg): Sidebar als Off-Canvas Drawer. Existing Routes (/item/:id) bleiben funktional als Fallback / Direct-Link.',
   (SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2)),

  (2, 43, 'ItemDetail als Slide-Over in Right-Sidebar (statt eigene Page)', 'feature', 'refined', 1,
   'Klick auf ein Issue öffnet die ItemDetail-View in der rechten Sidebar — ohne Routen-Wechsel. PO behält den Kontext der Liste/des Boards und kann zwischen Issues navigieren ohne Page-Reload.',
   'Aktuell ist ItemDetail eine eigene Route /item/:id mit Back-Button. Das zerreisst den Kontext: PO sieht das Board, klickt eine Karte, verliert die Übersicht, navigiert zurück, scrollt wieder hin. GitLab und Vibe lösen das mit Slide-Over / Right-Panel.',
   'Neuer State im RoadmapBoard / SprintReview: selectedItemId. Wenn gesetzt → Right-Sidebar visible, lädt /api/backlog/:id und rendert ItemDetail-Komponente in der Sidebar. URL-Sync via Search-Param ?item=ID (statt Route /item/:id) für Deep-Links. Bestehende Route /item/:id bleibt als Fallback (Direct-Link funktioniert weiter, redirected wahlweise auf Board mit ?item=ID). Close-Button (Esc oder X) in der Sidebar. Sidebar ist resizable (drag-handle links).',
   (SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2)),

  (2, 44, 'Tab-Container in Right-Sidebar (Details / Notes / Reviews / Activity)', 'feature', 'refined', 2,
   'ItemDetail in der Right-Sidebar wird in Tabs gegliedert: Details (Stammdaten + Status-Aktion), Notes (PO-Notes + Markdown), Reviews (Review-Runden-Historie), Activity (audit_log-Stream).',
   'Vorbild Vibe-Kanban Right-Panel mit Preview/Git/Terminal/Notes Tabs. Das aktuelle ItemDetail mit 5 Cards untereinander ist zu lang für eine Sidebar — Tabs sind die natürliche Antwort.',
   'Neue Komponente <Tabs> in src/components (oder via Headless-UI). Active-Tab in localStorage persistieren pro Issue-Typ. Activity-Tab liest aus audit_log: WHERE table_name="backlog" AND record_id=:id ORDER BY changed_at DESC, formatiert als Liste (Icon + Aktion + Diff + Zeit). Notes-Tab behält Markdown-Editor + Attachments-Dropzone. Reviews-Tab: Liste der review_feedback-Rows mit Status-Pill und Notes.',
   (SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2)),

  (2, 45, 'Cards → Liste mit horizontalen Trennern (Backlog-Spalte, Reviews)', 'improvement', 'refined', 2,
   'Listen-artige Inhalte (Backlog-Spalte, Review-Runden, Tasks) werden card-los gerendert: Trennlinien zwischen Zeilen statt eigener Card-Border. Reduziert visuellen Lärm massiv.',
   'GitLab und Vibe verzichten auf Card-Wrapper für Listen. Aktuell hat jedes Item in der Backlog-Spalte eine eigene Card mit Border, was bei 8+ Items zu visuellem Rauschen führt. Kanban-Spalten brauchen Cards weiterhin (Drag & Drop braucht eine klare Boundary).',
   'In RoadmapBoard: nur die Sprint-Spalte und "Neu"-Spalte behalten Card-Wrapper für DnD; Backlog-Spalte wird zur Liste. SprintReview Review-Runden-Liste: Trenner. ItemDetail Tasks/Reviews-Listen: Trenner. Trenner-Style: border-bottom 1px var(--surface0), py-2 pro Row. Hover-State: bg var(--mantle).',
   (SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2)),

  (2, 46, 'Mobile Fallback: Right-Sidebar als Modal / Off-Canvas', 'improvement', 'refined', 3,
   'Auf kleinen Viewports (<lg, <1024 px) wird die Right-Sidebar nicht als 360 px Slide-Over gerendert sondern als Full-Screen Modal/Off-Canvas. Linke Nav-Sidebar wird zum Drawer (Burger-Toggle).',
   'Mobile Use-Case ist gelegentlich aber wichtig — Erik prüft Sprints unterwegs. Sidebar mit fester Breite würde auf einem iPhone den Hauptinhalt unsichtbar machen.',
   'Tailwind-Breakpoints: lg = 1024 px ist die Schwelle. Linke Sidebar: lg:flex / hidden + Burger-Button im Top-Bar. Right-Sidebar: bei !lg fixed inset-0 mit overlay + close-on-overlay-click. Touch-Targets min 44 px sind bereits Convention. Animation: slide-in 200ms ease.',
   (SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2));

-- ============================================================
-- Sprint 7 — Visual Refinement (7 Stories: DD-47..53)
-- ============================================================

INSERT INTO backlog (project_id, project_number, title, type, status, priority, goal, background, context_notes, assigned_sprint)
VALUES
  (2, 47, 'Color-Token-Refactor (1 Primary + 4 semantische Tokens)', 'improvement', 'refined', 1,
   'Semantische CSS-Custom-Properties etablieren: --accent-primary (peach), --accent-success (green), --accent-danger (red), --accent-warning (yellow), --accent-info (sapphire). Bestehender Code referenziert Catppuccin-Farbnamen direkt — wird auf semantische Tokens migriert.',
   'Aktuell konkurrieren ~5 Farb-Layer pro Screen, weil Catppuccin alle Farben gleichberechtigt anbietet. Ohne semantisches Mapping wird daraus visueller Lärm. Eine semantische Schicht zwingt Disziplin: "war diese Farbe ein primary action oder ein status?"',
   'In src/index.css neue Variablen-Block "Semantische Akzente" einführen. Migration: alle inline style={{ background: var(--green) }} im Frontend identifizieren und auf var(--accent-success) umstellen — wenn semantik passt. Neutrale Catppuccin-Tokens (mauve, lavender, teal, sapphire) bleiben für Tags und Priority-Borders erlaubt. Doku: docs/UI-Audit Tabelle 6.2 ist die Referenz.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 48, 'Issue-Card Color-Reduktion (Lucide-Icon, Border-Left, Status-Outlier)', 'improvement', 'refined', 1,
   'Pro Issue-Card max ein Akzent: Type wird als Lucide-Icon (monochrom) links neben dem Title angezeigt, Priority als 4 px Border-Left auf der Card, Status-Pill nur bei Outlier-Status (in_progress, blocked, to_review) — refined/planned werden implizit durch die Spalte kommuniziert.',
   'Aktuelle IssueCard im RoadmapBoard hat 3-5 farbige Pills pro Card: P-Pill, Type-Letter-Pill, ID, Title, Status-Pill, Tag-Chips. Das ist zu viel visueller Lärm für eine Karte, die im Wesentlichen einen Title und eine ID kommuniziert.',
   'src/views/RoadmapBoard.jsx IssueCard-Komponente refactoren. Lucide-Icons: feature → Sparkles, bug → Bug, improvement → ArrowUpRight, chore → Wrench, refactor → Code2, security → ShieldCheck. Priority-Border: border-l-4 mit var(--priority-1..5) (separate Tokens, nicht shared mit accent). Status-Pill conditional rendern.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 49, 'Sprint-Spalten-Hierarchie (Active hervorheben)', 'improvement', 'refined', 1,
   'Aktiver Sprint visuell hervorheben (3 px peach Top-Border + leicht hellerer Mantle-Hintergrund + größeres Heading). Backlog/Neu-Spalten visuell zurücktreten (nur Border, kein gefüllter Hintergrund).',
   'Aktuell sind alle Spalten visuell gleichgewichtig, obwohl der aktive Sprint die strategisch wichtigste Spalte ist. Auge weiß nicht, wo der Fokus liegen soll.',
   'In RoadmapBoard: visibleSprints filtert auf active+planning. Den active-Sprint mit zusätzlichen Klassen rendern (bg-[var(--mantle)] + border-t-[3px] border-[var(--accent-primary)]). Sprint-Header-Title text-base statt text-sm. Sprint-Header-Icons (Edit, Reorder) in ein "..."-Menu zusammenfassen.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 50, 'Typography (JetBrains Mono Heading) + Spacing-Tokens (4px-Grid)', 'improvement', 'refined', 1,
   'JetBrains Mono als Display-Font für Headings (Page-Title, Section-Heading) etablieren — Body bleibt System-UI. Spacing-Tokens auf 4 px-Grid normieren: Card-Padding p-4 default, p-6 nur Hero. Type-Skala: text-2xl font-bold (Page), text-base font-semibold (Section), text-sm font-medium (Card-Title), text-sm (Body), text-xs uppercase tracking-wide font-mono (Meta).',
   'Aktuell fast alles text-sm und text-xs ohne klare Hierarchie. Das macht es schwer, auf einen Blick die wichtigsten Elemente zu erkennen. JetBrains Mono gibt der App einen klaren Tech-Charakter ohne aufdringlich zu sein.',
   'JetBrains Mono via Google Fonts (woff2) lokal hosten oder via @import. CSS-Variable --font-display: "JetBrains Mono", monospace. Tailwind-Config erweitern: fontFamily.display. Headings (h1, h2, h3 + Page-Titles) bekommen font-display Klasse. Body bleibt -apple-system. Spacing: existierende p-3/p-5/p-6 Inkonsistenzen auf p-4 / p-6 normalisieren.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 51, 'SprintReview Verdichtung (Segmented-Control, collapsed Comment)', 'improvement', 'refined', 2,
   'SprintReview-Header schlanker, Comment-Textarea collapsed by default (1 Zeile, expand on focus), Passed/Partially/Not-Passed als Segmented-Control statt 4 Pillen. "Review:"-Prefix entfernen, Sprint-Name als Hero-Heading.',
   'Aktuelle SprintReview-Cards sind sehr großzügig: viel Padding, Comment-Textarea immer 4-5 Zeilen leer, vier Status-Pillen mit gleicher Visual-Weight. Bei einem Sprint mit 6 Issues füllt das 3+ Viewport-Höhen.',
   'Header: sprint.name als <h1 class="font-display text-2xl">. Counts als horizontale Stat-Reihe (Zahl + farbiger Dot). Comment-Field: useState(showComment), default false, click "Kommentar hinzufügen" → expand. Status: <SegmentedControl> aus Sprint 8 oder vorher inline (3 Buttons in einer Pill-Group). Screenshot als sekundärer Icon-Button rechts.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 52, 'Edit-Form Sektionierung (3 Sektionen, Sticky Bottom-Bar)', 'improvement', 'refined', 2,
   'ItemDetail Edit-Form in 3 Sektionen mit Sub-Headings gliedern: Stammdaten (Title/Type/Priority/Tags), Beschreibung (Description), KI-Kontext (Goal/Background/Context Notes/Relevant Files). Sticky Bottom-Bar mit Cancel + Save (ghost + primary). Auto-Resize Textareas. Pflichtfeld-Marker (*) konsistent.',
   'Aktuell 8+ Felder als lange Single-Column-Liste (1.5 Viewport Scroll). Speichern-Button nimmt die ganze Breite und ist überdimensioniert. Pflicht- vs. Optional-Felder nicht visuell unterschieden.',
   'In ItemDetail.jsx Edit-Form refactoren. Sticky-Bar: position fixed bottom-0 left-0 right-0 (innerhalb der Sidebar) mit Background var(--base) + border-t. Auto-Resize Textareas via useLayoutEffect oder library (react-textarea-autosize). Relevant Files: TagInput-ähnliche UI statt JSON-Textarea (eigener Sub-Task im selben Story).',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2)),

  (2, 53, 'Tag-Color-Constraint + Migration 011 (14 → 6 Farben)', 'improvement', 'refined', 2,
   'Tag-Auswahl auf 6 Catppuccin-Farben begrenzen: blue, green, peach, mauve, teal, gray (overlay0). Existierende Tags mit anderen Farben werden auf gray gemappt. Tag-Verwaltungs-UI in Settings reflektiert nur diese 6 Optionen.',
   'Aktuell stehen alle 14 Catppuccin-Farben für Tags zur Auswahl. Das macht die UI sehr bunt, weil Tags überall (Issue-Cards, Filter-Bar) prominent dargestellt werden. 6 Farben reichen für die typische Anzahl gleichzeitig genutzter Tags.',
   'Migration 011_v3_tag_color_constraint.sql: UPDATE tags SET color = "overlay0" WHERE color NOT IN ("blue","green","peach","mauve","teal","overlay0"). Frontend: TagMultiSelect.jsx und ProjectSettings.jsx TAG_COLORS-Konstante reduzieren. Backend: Validation in POST/PUT /api/tags entsprechend reduzieren.',
   (SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2));

-- ============================================================
-- Sprint 8 — Component-Library (5 Stories: DD-54..58)
-- ============================================================

INSERT INTO backlog (project_id, project_number, title, type, status, priority, goal, background, context_notes, assigned_sprint)
VALUES
  (2, 54, 'Custom-Select-Component (Tailwind, Catppuccin, Searchable)', 'feature', 'refined', 2,
   'Wiederverwendbare <Select> Komponente, die native HTML-<select> ersetzt. Catppuccin-styled, Keyboard-Nav (Arrow up/down, Enter, Esc), optional Search-Filter ab N Optionen, Placeholder, disabled State.',
   'Aktuelle Forms (RoadmapBoard-Toolbar, IssueCreateModal, SprintEditModal) verwenden native <select>, das mit Browser-default-Style bricht visuell mit Catppuccin und sieht unprofessionell aus.',
   'Neue Komponente src/components/Select.jsx. API: <Select value options onChange placeholder searchable>. Headless-UI Listbox als Basis möglich (bereits via @headlessui/react?). Wenn nicht: minimal selber bauen mit useState + useRef. Replace-Targets: alle <select>-Tags in RoadmapBoard, IssueCreateModal, SprintEditModal, ProjectSettings.',
   (SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2)),

  (2, 55, 'Lucide-Icon-Set für Type / Actions / Status (konsistent)', 'improvement', 'refined', 2,
   'Konsistentes Icon-Set über die ganze App via lucide-react. Type-Icons (Bug, Sparkles, Wrench, Code2, ShieldCheck, ArrowUpRight) und Action-Icons (Pencil, Trash2, ChevronUp/Down, MoreHorizontal, X, Plus). Eigene Komponente <Icon name size /> als Wrapper.',
   'Aktuell mischt die App Unicode-Symbole, SVG-Snippets inline und Text-Buttons. Das wirkt inkonsistent. Lucide ist bereits genutzt (im Layout-Header für Roadmap/Trash) und ein gut etabliertes Icon-Set.',
   'lucide-react als Dependency hinzufügen (npm i lucide-react). Optional Wrapper-Komponente <Icon name /> mit fester Größe (16/20/24). Inventory: alle Icon-Stellen identifizieren (RoadmapBoard, ItemDetail, SprintReview, Layout, Modals) und auf Lucide umstellen. Type-Icon-Mapping als Konstante.',
   (SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2)),

  (2, 56, 'Pill / IconButton / SegmentedControl / EmptyState / StickyActionBar', 'feature', 'refined', 2,
   'Component-Library erweitern um wiederverwendbare Bausteine, die heute mehrfach inline gebaut werden: <Pill> mit Variants (filled/outline/ghost, sm/md), <IconButton> mit Touch-Target 44 px und Hover-State, <SegmentedControl> für 2-5-Option Pickers, <EmptyState> mit Icon + Text + optional Action, <StickyActionBar> für Edit-Forms.',
   'In Sprint 6 und 7 werden diese Pattern mehrfach improvisiert (z.B. Status-Pills im Header, Edit-Buttons in Sprint-Header). Eine zentrale Library erleichtert Konsistenz und spätere Visual-Updates.',
   'src/components/ui/ neuer Ordner. Jede Komponente in eigener Datei, mit Props-API JSDoc-dokumentiert. <Pill variant="filled|outline|ghost" color="primary|success|danger|warning|info|neutral" size="sm|md">. <IconButton icon variant tooltip>. <SegmentedControl options value onChange>. <EmptyState icon title description action>. <StickyActionBar>{children}</StickyActionBar> mit Slot Cancel/Save.',
   (SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2)),

  (2, 57, 'Empty-States für leere Spalten und Accordions', 'improvement', 'refined', 3,
   'Wenn Backlog-Spalte leer: <EmptyState> mit Icon + "Noch keine Items im Backlog" + Action "+ Issue erstellen". Wenn ItemDetail-Accordion (Goal/Dependencies/Reviews) leer: nicht rendern oder dezenter "+ X hinzufügen"-CTA statt leerer Card.',
   'Aktuell zeigen leere Spalten nur "Leer" als Text in overlay0 — kein Affordance, kein Anker. ItemDetail-Accordions zeigen den Heading auch wenn Inhalt leer ist, was den Screen unnötig streckt.',
   'In RoadmapBoard: Spalten-Render-Logic prüft items.length === 0 → <EmptyState> aus DD-56. In ItemDetail (oder Right-Sidebar Tab "Details"): conditional rendering für Goal/Background/Dependencies/Reviews — nur wenn Inhalt vorhanden, sonst CTA-Row "+ Goal hinzufügen".',
   (SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2)),

  (2, 58, 'Filter-Popover-Component (Inhalt-Header in jeder Liste)', 'feature', 'refined', 3,
   'Wiederverwendbare <FilterPopover> Komponente mit aktivem-Filter-Counter ("Filter (2)"). Wird im Hauptinhalt-Header von RoadmapBoard, TrashView, ggf. SprintReview verwendet. Inhalt: Type-Multi, Priority-Multi, Tag-Multi (DD-29 TagMultiSelect wiederverwenden).',
   'Aus Sprint 6 (App-Shell) ergibt sich, dass die Top-Toolbar wegfällt. Filter wandern zu jedem Inhalt-Header. Wenn jede View sich eigene Filter baut, divergiert die UX. Eine zentrale Component zwingt Konsistenz.',
   'src/components/ui/FilterPopover.jsx. API: <FilterPopover filters onChange />. filters-Schema: [{ key, label, type: "select"|"multi-select"|"toggle", options }]. Active-Count = Anzahl gesetzter Filter ungleich default. Popover-Position: bottom-start des Trigger-Buttons. Replaces inline Filter-UI in RoadmapBoard.',
   (SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2));

COMMIT;

-- Verify
SELECT 'Sprints angelegt:' AS info;
SELECT id, name, status FROM sprints WHERE id >= (SELECT MIN(id) FROM sprints WHERE name LIKE 'Sprint 6%' AND project_id=2) ORDER BY id;
SELECT '--- Stories Sprint 6 ---' AS info;
SELECT 'DD-' || project_number AS k, title, priority FROM backlog WHERE assigned_sprint=(SELECT id FROM sprints WHERE name = 'Sprint 6 — App-Shell & Navigation' AND project_id = 2) ORDER BY priority, project_number;
SELECT '--- Stories Sprint 7 ---' AS info;
SELECT 'DD-' || project_number AS k, title, priority FROM backlog WHERE assigned_sprint=(SELECT id FROM sprints WHERE name = 'Sprint 7 — Visual Refinement (Color, Type, Density)' AND project_id = 2) ORDER BY priority, project_number;
SELECT '--- Stories Sprint 8 ---' AS info;
SELECT 'DD-' || project_number AS k, title, priority FROM backlog WHERE assigned_sprint=(SELECT id FROM sprints WHERE name = 'Sprint 8 — Component-Library' AND project_id = 2) ORDER BY priority, project_number;
