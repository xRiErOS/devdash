package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-149: zentrale Navigations-Policy.
//   esc → Projekt schließen → HomeView (Lobby), aus JEDEM View.
//   q   → einen View zurück (Detail/Milestone/Sprint → Tree; Backlog/ReviewsList →
//         topReturn; Review → reviewReturn; Tree/Columns → Home).
//   ctrl+c bleibt Hard-Quit (Confirm), nicht Teil der q-Policy.

func esc() tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyEsc} }

// esc aus den Ranger-Detailflächen schließt das Projekt (→ Lobby), nicht nur zurück
// zum Tree.
func TestDD2149_EscClosesProjectFromDetailViews(t *testing.T) {
	for _, v := range []viewID{viewDetail, viewMilestone, viewSprint, viewColumns} {
		m := columnsModel()
		m.view = v
		mi, _ := m.Update(esc())
		if got := mi.(model).view; got != viewHome {
			t.Errorf("esc aus view=%d → view=%d, want viewHome", v, got)
		}
	}
}

// q aus den Ranger-Detailflächen kehrt zum Tree-Primat zurück (nicht zur Lobby).
func TestDD2149_QStepsBackToTreeFromDetailViews(t *testing.T) {
	for _, v := range []viewID{viewDetail, viewMilestone, viewSprint} {
		m := columnsModel()
		m.view = v
		mi, _ := m.Update(keyMsg("q"))
		if got := mi.(model).view; got != viewTree {
			t.Errorf("q aus view=%d → view=%d, want viewTree", v, got)
		}
	}
}

// q im Backlog kehrt zur Ursprungs-View zurück (topReturn = Tree), esc schließt das Projekt.
func TestDD2149_BacklogQAndEsc(t *testing.T) {
	mk := func() model {
		m := newModel(nil, &api.Project{Slug: "devd2", Prefix: "DD2"}, nil)
		m.view = viewBacklog
		m.topReturn = viewTree
		return m
	}
	// q → Tree (PO-Beispiel: „backlog mit q verlassen → treeview")
	mq, _ := mk().Update(keyMsg("q"))
	if got := mq.(model).view; got != viewTree {
		t.Errorf("Backlog q → view=%d, want viewTree", got)
	}
	// esc (ohne aktiven Filter) → Lobby
	me, _ := mk().Update(esc())
	if got := me.(model).view; got != viewHome {
		t.Errorf("Backlog esc → view=%d, want viewHome", got)
	}
}

// q im Review-Cockpit kehrt zur Quell-View (reviewReturn) zurück, esc schließt das Projekt.
func TestDD2149_ReviewQAndEsc(t *testing.T) {
	// q → reviewReturn (hier: ReviewsList)
	m := reviewModel()
	mi, _ := m.Update(keyMsg("q"))
	if got := mi.(model).view; got != viewReviewsList {
		t.Errorf("Review q → view=%d, want viewReviewsList (reviewReturn)", got)
	}
	// esc → Lobby
	m2 := reviewModel()
	mi2, _ := m2.Update(esc())
	if got := mi2.(model).view; got != viewHome {
		t.Errorf("Review esc → view=%d, want viewHome", got)
	}
}
