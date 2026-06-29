package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-154: Project-Browser blendet abgeschlossene Einträge über ALLE Spalten
// standardmäßig aus. Milestone/Sprint filterten bereits (completed/cancelled);
// die Issue-Spalte ließ erledigte „done"-Issues stehen → jetzt ebenfalls versteckt.
func TestDD2154_DefaultFiltersHideClosed(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)

	// Milestone- + Sprint-Spalte (unverändert, als Regressionsanker).
	if m.fMile.shown("completed") || m.fMile.shown("cancelled") {
		t.Error("Milestone-Filter sollte completed/cancelled verstecken")
	}
	if m.fSprint.shown("completed") || m.fSprint.shown("cancelled") {
		t.Error("Sprint-Filter sollte completed/cancelled verstecken")
	}
	// Issue-Spalte: done + cancelled versteckt, offene Stati sichtbar.
	if m.fIssue.shown("done") {
		t.Error("Issue-Filter sollte abgeschlossene (done) standardmäßig verstecken")
	}
	if m.fIssue.shown("cancelled") {
		t.Error("Issue-Filter sollte cancelled verstecken")
	}
	for _, open := range []string{"new", "planned", "in_progress", "to_review", "passed"} {
		if !m.fIssue.shown(open) {
			t.Errorf("Issue-Status %q sollte sichtbar bleiben", open)
		}
	}
}

// visIssues wendet den Default an: done/cancelled raus, offene drin.
func TestDD2154_VisIssuesExcludesClosed(t *testing.T) {
	m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
	m.milestones = []api.Milestone{{ID: 1, Name: "M1", Status: "active",
		Sprints: []api.Sprint{{ID: 10, Key: "DD2#1", Status: "active"}}}}
	m.mlist.setLen(1)
	m.slist.setLen(1)
	m.curSprint = &api.Sprint{ID: 10, Items: []api.Issue{
		{ID: 1, Key: "DD2-1", Status: "in_progress"},
		{ID: 2, Key: "DD2-2", Status: "done"},
		{ID: 3, Key: "DD2-3", Status: "cancelled"},
		{ID: 4, Key: "DD2-4", Status: "to_review"},
	}}

	vis := m.visIssues()
	if len(vis) != 2 {
		t.Fatalf("visIssues = %d, want 2 (in_progress + to_review)", len(vis))
	}
	for _, it := range vis {
		if it.Status == "done" || it.Status == "cancelled" {
			t.Errorf("abgeschlossenes Issue %s (%s) sollte ausgeblendet sein", it.Key, it.Status)
		}
	}
}
