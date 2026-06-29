package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-154 (Nachzug): der Bug saß nicht im (gesunsetteten) Columns-Filter
// (fIssue/visIssues), sondern im aktiven Primat-Tree (view_browse_project).
// Der Tree filtert über fStatus (Whitelist, default leer = alles), nicht über
// die per-kind hidden-Sets → completed/cancelled blieben im Default-Browser
// sichtbar. Diese Tests sperren das gewünschte Verhalten am Tree selbst fest.

func treeStatusModel() model {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.milestones = []api.Milestone{
		{ID: 1, Name: "Active M", Status: "in_progress", Sprints: []api.Sprint{
			{ID: 10, Key: "DD2#1", Name: "Active S", Status: "in_progress"},
			{ID: 11, Key: "DD2#2", Name: "Done S", Status: "completed"},
		}},
		{ID: 2, Name: "Done M", Status: "completed", Sprints: []api.Sprint{
			{ID: 20, Key: "DD2#3", Name: "Sub S", Status: "in_progress"},
		}},
	}
	m.treeExpMile = map[int]bool{1: true, 2: true}
	m.treeExpSprint = map[int]bool{10: true, 11: true, 20: true}
	m.treeIssues = map[int][]api.Issue{
		10: {
			{ID: 1, Key: "DD2-1", Title: "open", Status: "in_progress"},
			{ID: 2, Key: "DD2-2", Title: "closed", Status: "completed"},
			{ID: 3, Key: "DD2-3", Title: "killed", Status: "cancelled"},
			{ID: 4, Key: "DD2-4", Title: "reviewed", Status: "passed"},
		},
	}
	return m
}

// nodeStatus löst den Status eines Tree-Knotens auf (Milestone/Sprint via Index,
// Issue via aufgelöstem Pointer).
func nodeStatus(m model, n treeNode) string {
	switch n.kind {
	case tkMile:
		return m.milestones[n.mileIdx].Status
	case tkSprint:
		return m.milestones[n.mileIdx].Sprints[n.sprIdx].Status
	case tkIssue:
		return n.issue.Status
	}
	return ""
}

// Default-Tree (kein Filter/keine Suche aktiv) blendet completed/cancelled über
// ALLE Ebenen aus — das ist die eigentliche PO-Fläche (Browser frisch geöffnet).
func TestDD2154_TreeNodesHideClosedByDefault(t *testing.T) {
	m := treeStatusModel()
	for _, n := range m.treeNodes() {
		switch nodeStatus(m, n) {
		case "completed", "cancelled":
			t.Errorf("kind=%d status=%q sollte im Default-Tree ausgeblendet sein", n.kind, nodeStatus(m, n))
		}
	}

	// Positiv-Anker: offene Einträge bleiben sichtbar.
	gotIssue := map[string]bool{}
	var sawActiveM, sawActiveS bool
	for _, n := range m.treeNodes() {
		switch n.kind {
		case tkMile:
			if m.milestones[n.mileIdx].Name == "Active M" {
				sawActiveM = true
			}
		case tkSprint:
			if m.milestones[n.mileIdx].Sprints[n.sprIdx].Name == "Active S" {
				sawActiveS = true
			}
		case tkIssue:
			gotIssue[n.issue.Key] = true
		}
	}
	if !sawActiveM || !sawActiveS {
		t.Errorf("offene Milestone/Sprint fehlen: M=%v S=%v", sawActiveM, sawActiveS)
	}
	if !gotIssue["DD2-1"] || !gotIssue["DD2-4"] {
		t.Errorf("offene Issues fehlen: %v", gotIssue)
	}
	if gotIssue["DD2-2"] || gotIssue["DD2-3"] {
		t.Errorf("abgeschlossene Issues sichtbar: %v", gotIssue)
	}
}

// Explizite fStatus-Whitelist (über Filter-Menü 'f') sticht den Default: ein
// completed-Issue, das default verborgen ist, wird wieder sichtbar (US-180).
// (Vorfahren-Milestones erscheinen im Filter-Pfad bewusst als Kontext, DD2-62 —
// daher kein Assert auf deren Sichtbarkeit.)
func TestDD2154_TreeWhitelistOverridesDefault(t *testing.T) {
	hasIssue := func(m model, key string) bool {
		for _, n := range m.treeNodes() {
			if n.kind == tkIssue && n.issue.Key == key {
				return true
			}
		}
		return false
	}

	// Default: completed-Issue verborgen.
	if hasIssue(treeStatusModel(), "DD2-2") {
		t.Fatal("DD2-2 (completed) sollte default verborgen sein")
	}
	// Whitelist {completed}: completed-Issue wieder sichtbar, offenes raus.
	m := treeStatusModel()
	m.fStatus = map[string]bool{"completed": true}
	if !hasIssue(m, "DD2-2") {
		t.Error("Whitelist {completed} sollte DD2-2 (completed) zeigen")
	}
	if hasIssue(m, "DD2-1") {
		t.Error("Whitelist {completed} sollte DD2-1 (in_progress) ausblenden")
	}
}

// Auch im Filter-/Such-Pfad (treeNodesFiltered) gilt der Default: eine reine
// Textsuche ohne Status-Whitelist zeigt keine abgeschlossenen Issues.
func TestDD2154_TreeFilteredHidesClosed(t *testing.T) {
	m := treeStatusModel()
	m.treeQuery = "DD2" // Suche aktiv → treeNodesFiltered, fStatus leer
	for _, n := range m.treeNodes() {
		if n.kind == tkIssue && (n.issue.Status == "completed" || n.issue.Status == "cancelled") {
			t.Errorf("Suche zeigt abgeschlossenes Issue %s (%s)", n.issue.Key, n.issue.Status)
		}
	}
}
