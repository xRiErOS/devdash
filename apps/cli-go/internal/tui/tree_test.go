package tui

// DD2-57: Tree+Detail-Prototyp — Flatten/Expand/Collapse-Logik.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// DD2-61: Tree+Detail ist Primat — newModel() startet bei vorhandenem Projekt
// direkt im Tree-View (Ranger-Columns nur noch via t erreichbar).
func TestNewModelDefaultsToTree(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	if m.view != viewTree {
		t.Errorf("Default-View = %d, want viewTree (%d)", m.view, viewTree)
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

	lines := m.treeLeftLines(nodes, 32)
	cur := lines[0]

	if !strings.HasPrefix(ansi.Strip(cur), "▌") {
		t.Fatalf("Cursor-Zeile ohne Balken: %q", ansi.Strip(cur))
	}
	if want := theme.Accent.Render(ansi.Strip(cur)); cur != want {
		t.Errorf("Cursor-Zeile nicht einheitlich akzentgetönt (D08)\n got: %q\nwant: %q", cur, want)
	}
	// Gegenprobe: eine Nicht-Cursor-Zeile behält ihre Eigen-Farben (≠ uniform Accent).
	m.treeCursor = 1
	other := m.treeLeftLines(nodes, 32)[0]
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
