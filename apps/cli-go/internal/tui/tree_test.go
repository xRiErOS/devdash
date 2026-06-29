package tui

// DD2-57: Tree+Detail-Prototyp — Flatten/Expand/Collapse-Logik.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// DD2-61: keyTree fängt vor dem globalen Key-Switch → p/R/b müssen im Tree explizit
// gewiret sein, sonst öffnen sich Picker/Reviews/Backlog nicht (Bug-Report Augenschein).
func TestTreeGlobalKeysReachable(t *testing.T) {
	base := func() model {
		m := treeModel()
		m.view = viewTree
		m.global = api.NewClient("")
		m.client = api.NewClient("")
		m.topReturn = viewTree
		return m
	}
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }

	if mb, _ := base().keyTree(key("b")); mb.(model).view != viewBacklog {
		t.Errorf("b → view=%d, want viewBacklog", mb.(model).view)
	}
	if mr, _ := base().keyTree(key("R")); mr.(model).view != viewReviewsList {
		t.Errorf("R → view=%d, want viewReviewsList", mr.(model).view)
	}
	// DD2-124: p öffnet den Picker als Overlay (projPick), kein View-Wechsel.
	if mp, _ := base().keyTree(key("p")); !mp.(model).projPick || mp.(model).view != viewTree {
		t.Errorf("p → projPick=%v view=%d, want projPick=true view=viewTree", mp.(model).projPick, mp.(model).view)
	}
	// DD2-124: Esc aus Backlog → Lobby (Esc-Spine). b bleibt der topReturn-Pfad.
	mb, _ := base().keyTree(key("b"))
	if back, _ := mb.(model).keyBacklog(key("esc")); back.(model).view != viewHome {
		t.Errorf("Backlog esc → view=%d, want viewHome (Esc-Spine)", back.(model).view)
	}
	if bk, _ := mb.(model).keyBacklog(key("b")); bk.(model).view != viewTree {
		t.Errorf("Backlog b → view=%d, want viewTree (topReturn)", bk.(model).view)
	}
}

// PO-Befund: Status-Mutation muss im Tree gehen (sonst kein Sprint→review → kein
// Review). S/s/d/y 1:1 aus dem Ranger portiert, am Knoten unter dem Cursor.
func TestTreeStatusShortcuts(t *testing.T) {
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }
	mk := func(cursor int) model {
		m := treeModel() // M1 active → S1 active(id10), S2 planning(id11)
		m.treeExpMile[1] = true
		m.treeIssues[10] = []api.Issue{{Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "in_progress"}}
		m.treeExpSprint[10] = true
		m.view = viewTree
		m.treeCursor = cursor
		return m
	}

	// DD2-174: s öffnet je Node-Typ das Status-Menü. Cursor 0 = Meilenstein → s
	// öffnet Meilenstein-Status-Menü (aktueller Status mit).
	if mi, _ := mk(0).keyTree(key("s")); !mi.(model).msPick || mi.(model).msTargetStatus != "active" {
		t.Errorf("s auf Meilenstein: msPick=%v status=%q", mi.(model).msPick, mi.(model).msTargetStatus)
	}
	// Cursor 1 = Sprint S1 (active) → s öffnet Sprint-Menü mit review-Transition.
	sp, _ := mk(1).keyTree(key("s"))
	mm := sp.(model)
	if !mm.sprintPick {
		t.Fatalf("s auf Sprint sollte sprintPick öffnen")
	}
	hasReview := false
	for _, o := range mm.spopts {
		if o == "review" {
			hasReview = true
		}
	}
	if !hasReview {
		t.Errorf("Sprint-active-Menü ohne review: %v", mm.spopts)
	}
	// Cursor 2 = Issue → s öffnet Issue-Status-Menü.
	if mi, _ := mk(2).keyTree(key("s")); !mi.(model).statusPick {
		t.Errorf("s auf Issue sollte statusPick öffnen")
	}
	// DD2-174: S ist jetzt Sort (im Tree unbelegt) — kein Status mehr, also no-op.
	if mi, _ := mk(1).keyTree(key("S")); mi.(model).msPick {
		t.Errorf("S (Sort) auf Sprint sollte kein Meilenstein-Menü öffnen")
	}
}

// DD2-61: Tree+Detail ist Primat — newModel() startet bei vorhandenem Projekt
// direkt im Tree-View (Ranger-Columns nur noch via t erreichbar).
func TestNewModelDefaultsToTree(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	if m.view != viewTree {
		t.Errorf("Default-View = %d, want viewTree (%d)", m.view, viewTree)
	}
}

// Regression: viewTree ist Primat-Default → erster Render passiert VOR dem
// Milestone-Load (leere Knotenliste). Darf nicht paniken (Zero-treeNode{} würde
// sonst m.milestones[0] auf leerer Slice greifen).
func TestViewTreeEmptyNoPanic(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.width, m.height = 90, 22
	if out := m.View(); out == "" {
		t.Fatal("leerer Tree-View sollte trotzdem Chrome rendern")
	}
}

// D08: Cursor-Zeile = Balken ▌ + ganze Zeile einheitlich in Akzentfarbe. Test im
// TrueColor-Profil (Ascii würde Farbe strippen) — die gerenderte Cursor-Zeile muss
// exakt EIN Accent-Render über (Balken + reinem Text) sein, also keine Fremd-Farb-
// codes der Zelle (Status-Dot/Key/Typ) mehr enthalten.
func TestTreeCursorRowTintedAccent(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii) // Golden-Tests erwarten Ascii

	m := treeModel()
	m.treeExpMile[1] = true
	nodes := m.treeNodes()
	m.treeCursor = 0 // Meilenstein-Zeile (trägt gefärbten Status-Dot)

	lines := m.treeLeftLines(nodes, 32, true)
	cur := lines[0]

	if !strings.HasPrefix(ansi.Strip(cur), "▌") {
		t.Fatalf("Cursor-Zeile ohne Balken: %q", ansi.Strip(cur))
	}
	if want := theme.Accent.Render(ansi.Strip(cur)); cur != want {
		t.Errorf("Cursor-Zeile nicht einheitlich akzentgetönt (D08)\n got: %q\nwant: %q", cur, want)
	}
	// Gegenprobe: eine Nicht-Cursor-Zeile behält ihre Eigen-Farben (≠ uniform Accent).
	m.treeCursor = 1
	other := m.treeLeftLines(nodes, 32, true)[0]
	if other == theme.Accent.Render(ansi.Strip(other)) {
		t.Errorf("Nicht-Cursor-Zeile fälschlich akzentgetönt: %q", other)
	}
}

func treeModel() model {
	return model{
		milestones: []api.Milestone{{
			ID: 1, Name: "M1", Status: "active",
			Sprints: []api.Sprint{
				{ID: 10, Key: "DD2#1", Name: "S1", Status: "active"},
				{ID: 11, Key: "DD2#2", Name: "S2", Status: "planning"},
			},
		}},
		treeExpMile:   map[int]bool{},
		treeExpSprint: map[int]bool{},
		treeIssues:    map[int][]api.Issue{},
		projectSearch: textinput.New(), // DD2-41: für openProjectPicker (Focus-Aufruf)
	}
}

// DD2-62: Tree-Suche filtert die Hierarchie. Match auf Meilenstein-Name,
// Sprint-Key/Name und (gecachte) Issue-Key/Title; Vorfahren matchender Knoten
// bleiben als Pfad sichtbar. Ungecachte Sprint-Issues sind nicht durchsuchbar.
func treeFilterModel() model {
	m := treeModel() // M1 → S1(DD2#1,id10) S2(DD2#2,id11)
	m.treeIssues[10] = []api.Issue{
		{Key: "DD2-1", Title: "Login bug", Type: "bug", Priority: 1, Status: "to_review"},
		{Key: "DD2-2", Title: "Logout flow", Type: "feature", Priority: 2, Status: "planned"},
	}
	return m
}

func kinds(nodes []treeNode) []treeKind {
	out := make([]treeKind, len(nodes))
	for i, n := range nodes {
		out[i] = n.kind
	}
	return out
}

func TestTreeFilterIssueMatchShowsPath(t *testing.T) {
	m := treeFilterModel()
	m.treeQuery = "login" // nur DD2-1 "Login bug" (DD2-2 "Logout" matcht nicht)
	nodes := m.treeNodes()
	if got := kinds(nodes); len(got) != 3 || got[0] != tkMile || got[1] != tkSprint || got[2] != tkIssue {
		t.Fatalf("kinds=%v, want [mile sprint issue] (M1→S1→DD2-1)", got)
	}
	if nodes[2].issIdx != 0 {
		t.Errorf("erwartet DD2-1 (issIdx 0), got issIdx %d", nodes[2].issIdx)
	}
}

func TestTreeFilterSprintMatch(t *testing.T) {
	m := treeFilterModel()
	m.treeQuery = "DD2#2" // Sprint S2 matcht per Key, keine Issues
	nodes := m.treeNodes()
	if got := kinds(nodes); len(got) != 2 || got[0] != tkMile || got[1] != tkSprint {
		t.Fatalf("kinds=%v, want [mile sprint] (M1→S2)", got)
	}
	if nodes[1].sprIdx != 1 {
		t.Errorf("erwartet S2 (sprIdx 1), got %d", nodes[1].sprIdx)
	}
}

func TestTreeFilterMilestoneMatchShowsMilestone(t *testing.T) {
	m := treeFilterModel()
	m.treeQuery = "m1" // Meilenstein-Name = Treffer; Sprints ohne eigenen Match nicht
	nodes := m.treeNodes()
	if got := kinds(nodes); len(got) != 1 || got[0] != tkMile {
		t.Fatalf("kinds=%v, want [mile] (nur M1 als Treffer)", got)
	}
}

// DD2-62 Rework: Issue-Type-Facette filtert projektweit (treeFilterIssues), kombi-
// niert mit Textsuche. PO-User-Story: Type=Bug + Suche 'login'.
func TestTreeFilterTypeFacet(t *testing.T) {
	m := treeFilterModel()
	// projektweite Quelle simulieren (wie nach loadAllIssues)
	sid := 10
	m.treeFilterIssues = []api.Issue{
		{Key: "DD2-1", Title: "Login bug", Type: "bug", Status: "to_review", AssignedSprint: &sid},
		{Key: "DD2-2", Title: "Login feature", Type: "feature", Status: "planned", AssignedSprint: &sid},
	}
	m.treeIssuesLoaded = true
	m.fType = map[string]bool{"bug": true}
	m.treeQuery = "login"
	nodes := m.treeNodes()
	// Erwartet: M1 → S1 → nur DD2-1 (Bug), die Feature fällt raus.
	if got := kinds(nodes); len(got) != 3 || got[2] != tkIssue {
		t.Fatalf("kinds=%v, want [mile sprint issue]", got)
	}
	if nodes[2].issue == nil || nodes[2].issue.Key != "DD2-1" {
		t.Errorf("erwartet DD2-1 (Bug), got %+v", nodes[2].issue)
	}
}

func TestTreeFilterNoMatchEmpty(t *testing.T) {
	m := treeFilterModel()
	m.treeQuery = "zzz-nichts"
	if got := m.treeNodes(); len(got) != 0 {
		t.Fatalf("kein Match → %d Knoten, want 0", len(got))
	}
}

// DD2-62: / öffnet Suche, tippen filtert live, enter übernimmt, esc löscht.
func TestTreeSearchFlow(t *testing.T) {
	src := treeFilterModel()
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.milestones, m.treeIssues = src.milestones, src.treeIssues
	m.view = viewTree
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }

	mi, _ := m.keyTree(key("/"))
	m = mi.(model)
	if !m.treeSearching {
		t.Fatal("/ sollte das Suchfeld öffnen")
	}
	for _, r := range "login" {
		mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{r}})
		m = mi.(model)
	}
	if m.treeQuery != "login" {
		t.Errorf("live-Filter query=%q, want login", m.treeQuery)
	}
	mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.treeSearching || m.treeQuery != "login" {
		t.Errorf("enter: searching=%v query=%q, want false/login", m.treeSearching, m.treeQuery)
	}
	mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.treeQuery != "" {
		t.Errorf("esc sollte aktiven Filter löschen, query=%q", m.treeQuery)
	}
}

// DD2-62 Rework: f öffnet das Filter-Menü, space toggelt eine Facette, enter
// schließt (Filter aktiv), tree-esc löscht Filter+Suche.
func TestTreeFilterMenuFlow(t *testing.T) {
	key := func(s string) tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)} }
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.view = viewTree

	mi, _ := m.keyTree(key("f"))
	m = mi.(model)
	if !m.treeFilterOpen {
		t.Fatal("f sollte das Filter-Menü öffnen")
	}
	idx := -1
	for i, it := range m.ffItems {
		if it.facet == "type" && it.value == "bug" {
			idx = i
		}
	}
	if idx < 0 {
		t.Fatal("Type:Bug-Eintrag fehlt im Menü")
	}
	m.ffMenu.cursor = idx
	mi, _ = m.keyTreeFilter(key(" "))
	m = mi.(model)
	if !m.fType["bug"] || !m.treeFilterActive() {
		t.Errorf("space sollte Type:Bug aktivieren (fType=%v)", m.fType)
	}
	mi, _ = m.keyTreeFilter(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.treeFilterOpen {
		t.Error("enter sollte Menü schließen")
	}
	mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.treeFilterActive() {
		t.Errorf("tree-esc sollte Filter löschen, fType=%v", m.fType)
	}
}

// DD2-62: aktiver Filter = Shield + Query rot (DESIGN „Filter aktiv"); inaktiv = Hint.
func TestTreeSearchLineActiveRed(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.treeQuery = "bug"
	if got, want := m.treeSearchLine(40), truncate(lipgloss.NewStyle().Foreground(theme.Red).Render("⌕ bug"), 40); got != want {
		t.Errorf("aktiver Filter nicht rot\n got: %q\nwant: %q", got, want)
	}
	m.treeQuery = ""
	if got := ansi.Strip(m.treeSearchLine(40)); !strings.Contains(got, "search with /") {
		t.Errorf("inaktiv sollte Hint zeigen, got %q", got)
	}
}

func TestTreeNodesFlatten(t *testing.T) {
	m := treeModel()

	// Eingeklappt: nur der Meilenstein-Knoten.
	if got := len(m.treeNodes()); got != 1 {
		t.Fatalf("collapsed: %d Knoten, want 1", got)
	}

	// Meilenstein auf → 1 Meilenstein + 2 Sprints.
	m.treeExpMile[1] = true
	if got := len(m.treeNodes()); got != 3 {
		t.Fatalf("milestone open: %d Knoten, want 3", got)
	}

	// Sprint 10 auf, Issues noch nicht geladen → +1 Info-Platzhalter.
	m.treeExpSprint[10] = true
	nodes := m.treeNodes()
	if got := len(nodes); got != 4 {
		t.Fatalf("sprint open uncached: %d Knoten, want 4 (mit (lädt …))", got)
	}
	if nodes[2].kind != tkInfo {
		t.Errorf("erwartet Info-Platzhalter an Index 2, got kind %d", nodes[2].kind)
	}

	// Issues im Cache → Platzhalter weicht echten Issue-Knoten.
	m.treeIssues[10] = []api.Issue{
		{Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "to_review"},
		{Key: "DD2-2", Title: "B", Type: "feature", Priority: 2, Status: "planned"},
	}
	nodes = m.treeNodes()
	if got := len(nodes); got != 5 { // mile + 2 sprints + 2 issues
		t.Fatalf("sprint open cached: %d Knoten, want 5", got)
	}
	if nodes[2].kind != tkIssue || nodes[3].kind != tkIssue {
		t.Errorf("Index 2/3 sollten Issue-Knoten sein")
	}
}

// Expand auf einem uncached Sprint löst den Lazy-Load aus (loadSprint-Cmd ≠ nil).
func TestTreeExpandLazyLoadsSprint(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	nodes := m.treeNodes() // [mile, sprint10, sprint11]
	m.treeCursor = 1       // Sprint 10

	mi, cmd := m.treeExpand(nodes)
	if cmd == nil {
		t.Fatal("Expand auf uncached Sprint sollte einen Load-Cmd liefern")
	}
	if !mi.(model).treeExpSprint[10] {
		t.Error("Sprint 10 sollte nach Expand als offen markiert sein")
	}
}

// Collapse eines Issue-Knotens klappt den Eltern-Sprint zu und klemmt den Cursor.
func TestTreeCollapseIssueClosesParentSprint(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.treeExpSprint[10] = true
	m.treeIssues[10] = []api.Issue{{Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "planned"}}
	nodes := m.treeNodes() // [mile, s10, issue, s11]
	m.treeCursor = 2       // Issue

	mi, _ := m.treeCollapse(nodes)
	mm := mi.(model)
	if mm.treeExpSprint[10] {
		t.Error("Eltern-Sprint 10 sollte nach Collapse zugeklappt sein")
	}
	if mm.treeCursor >= len(mm.treeNodes()) {
		t.Errorf("Cursor %d nicht geklemmt (Knoten=%d)", mm.treeCursor, len(mm.treeNodes()))
	}
}

func TestWindowAroundKeepsCursorVisible(t *testing.T) {
	lines := []string{"0", "1", "2", "3", "4", "5", "6", "7", "8", "9"}
	win := windowAround(lines, 4, 8)
	if len(win) != 4 {
		t.Fatalf("Fensterhöhe %d, want 4", len(win))
	}
	// Cursor 8 muss im Fenster liegen (letzte 4 → Index 6..9).
	found := false
	for _, l := range win {
		if l == "8" {
			found = true
		}
	}
	if !found {
		t.Errorf("Cursor-Zeile nicht im Fenster: %v", win)
	}
}
