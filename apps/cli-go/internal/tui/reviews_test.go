package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func TestReviewsListOpensViaR(t *testing.T) {
	m := columnsModel()
	mi, cmd := m.Update(keyMsg("R"))
	m = mi.(model)
	if m.view != viewReviewsList {
		t.Errorf("R → view=%d, want viewReviewsList", m.view)
	}
	if cmd == nil {
		t.Error("R sollte loadReviewSprints dispatchen")
	}
}

func TestReviewsListMsgPopulates(t *testing.T) {
	m := columnsModel()
	mi, _ := m.openReviewsList()
	m = mi.(model)
	mi, _ = m.Update(reviewSprintsMsg{[]api.Sprint{
		{ID: 10, Key: "SPF#1", Name: "S1", Status: "to_review"},
		{ID: 11, Key: "SPF#2", Name: "S2", Status: "to_review"},
	}})
	m = mi.(model)
	if len(m.reviewSprints) != 2 || m.rvlist.length != 2 {
		t.Fatalf("reviewSprints=%d rvlist.length=%d, want 2/2", len(m.reviewSprints), m.rvlist.length)
	}
}

func TestReviewsListEnterOpensCockpit(t *testing.T) {
	m := columnsModel()
	m.view = viewReviewsList
	m.reviewSprints = []api.Sprint{{ID: 42, Key: "SPF#5", Name: "S5", Status: "to_review"}}
	m.rvlist.setLen(1)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.view != viewReview {
		t.Errorf("enter → view=%d, want viewReview", m.view)
	}
	if m.reviewReturn != viewReviewsList {
		t.Error("reviewReturn nicht auf Liste gesetzt (q/esc kehrt sonst nicht zurück)")
	}
	if cmd == nil {
		t.Error("enter sollte loadSprint(42) dispatchen")
	}
}

func TestCockpitEscReturnsToList(t *testing.T) {
	m := reviewModel() // reviewReturn=viewReviewsList
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewReviewsList {
		t.Errorf("q im Cockpit → view=%d, want viewReviewsList", m.view)
	}
	if cmd == nil {
		t.Error("Rückkehr zur Liste sollte sie neu laden")
	}
}
