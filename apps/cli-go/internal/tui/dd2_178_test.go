package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-178: Filter im Project-Browser darf den Expand/Collapse-Zustand NICHT mehr
// zwangsaufklappen (kein hardcodiertes open:true in treeNodesFiltered). Ein
// collapsed Knoten zeigt seinen ▸-Marker, blendet aber seine Kinder aus — strikt
// wie treeNodes() ohne Filter. Filter-Clear lässt die Expand-Maps unangetastet.

func dd2178Model() model {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.milestones = []api.Milestone{
		{ID: 1, Name: "Active M", Status: "in_progress", Sprints: []api.Sprint{
			{ID: 10, Key: "DD2#1", Name: "Active S", Status: "in_progress"},
		}},
	}
	m.treeIssues = map[int][]api.Issue{
		10: {
			{ID: 1, Key: "DD2-1", Title: "open one", Status: "in_progress"},
			{ID: 4, Key: "DD2-4", Title: "open two", Status: "in_progress"},
		},
	}
	m.treeQuery = "open" // Suche aktiv → treeNodesFiltered
	return m
}

func dd2178HasIssue(m model, key string) bool {
	for _, n := range m.treeNodes() {
		if n.kind == tkIssue && n.issue.Key == key {
			return true
		}
	}
	return false
}

func dd2178SprintNode(m model, id int) (treeNode, bool) {
	for _, n := range m.treeNodes() {
		if n.kind == tkSprint && n.sprintID == id {
			return n, true
		}
	}
	return treeNode{}, false
}

// Collapsed Sprint bei aktivem Filter: Sprint-Knoten sichtbar (Treffer-Pfad),
// aber seine Issues ausgeblendet und open=false (▸-Marker).
func TestDD2178_FilteredCollapsedSprintHidesIssues(t *testing.T) {
	m := dd2178Model()
	m.treeExpMile = map[int]bool{1: true}
	m.treeExpSprint = map[int]bool{10: false}

	n, ok := dd2178SprintNode(m, 10)
	if !ok {
		t.Fatal("Sprint-Knoten DD2#1 fehlt im Filter-Pfad")
	}
	if n.open {
		t.Error("collapsed Sprint sollte open=false sein (kein Force-Expand)")
	}
	if dd2178HasIssue(m, "DD2-1") || dd2178HasIssue(m, "DD2-4") {
		t.Error("collapsed Sprint sollte seine Issues ausblenden")
	}
}

// Expanded Sprint zeigt seine Treffer-Issues normal.
func TestDD2178_FilteredExpandedSprintShowsIssues(t *testing.T) {
	m := dd2178Model()
	m.treeExpMile = map[int]bool{1: true}
	m.treeExpSprint = map[int]bool{10: true}

	if !dd2178HasIssue(m, "DD2-1") || !dd2178HasIssue(m, "DD2-4") {
		t.Error("expanded Sprint sollte seine Treffer-Issues zeigen")
	}
	n, _ := dd2178SprintNode(m, 10)
	if !n.open {
		t.Error("expanded Sprint sollte open=true sein")
	}
}

// Collapsed Milestone blendet seine Sprints aus, bleibt aber selbst sichtbar
// (Treffer-Vorfahr, expandierbar).
func TestDD2178_FilteredCollapsedMilestoneHidesSprints(t *testing.T) {
	m := dd2178Model()
	m.treeExpMile = map[int]bool{1: false}
	m.treeExpSprint = map[int]bool{10: true}

	var sawMile, sawSprint bool
	for _, n := range m.treeNodes() {
		switch n.kind {
		case tkMile:
			sawMile = true
			if n.open {
				t.Error("collapsed Milestone sollte open=false sein")
			}
		case tkSprint:
			sawSprint = true
		}
	}
	if !sawMile {
		t.Error("Milestone-Treffer-Vorfahr sollte sichtbar bleiben")
	}
	if sawSprint {
		t.Error("collapsed Milestone sollte seine Sprints ausblenden")
	}
}

// Filter-Clear (Back/Esc bei aktivem Filter) darf die Expand-Maps NICHT leeren.
func TestDD2178_FilterClearKeepsExpandState(t *testing.T) {
	m := dd2178Model()
	m.treeExpMile = map[int]bool{1: true}
	m.treeExpSprint = map[int]bool{10: true}

	updated, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEsc})
	got := updated.(model)
	if !got.treeExpMile[1] || !got.treeExpSprint[10] {
		t.Errorf("Filter-Clear sollte Expand-Maps erhalten: mile=%v sprint=%v",
			got.treeExpMile, got.treeExpSprint)
	}
	if got.treeActive() {
		t.Error("Filter-Clear sollte Suche/Filter zurücksetzen (treeActive=false)")
	}
}
