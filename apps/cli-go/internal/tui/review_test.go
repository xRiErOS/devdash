package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func reviewModel() model {
	m := columnsModel()
	m.curSprint = &api.Sprint{ID: 10, Key: "SPF#1", Items: []api.Issue{
		{ID: 100, Key: "SPF-1", Title: "A", Status: "to_review"},
	}}
	mi, _ := m.Update(keyMsg("R")) // selSprint id10 == curSprint id10
	return mi.(model)
}

func TestReviewEnter(t *testing.T) {
	m := reviewModel()
	if m.view != viewReview {
		t.Fatalf("view=%d, want viewReview", m.view)
	}
	if m.rlist.length != 1 {
		t.Errorf("rlist.length=%d, want 1", m.rlist.length)
	}
}

func TestReviewPassDispatch(t *testing.T) {
	m := reviewModel()
	_, cmd := m.Update(keyMsg("a"))
	if cmd == nil {
		t.Error("'a' (pass) sollte eine Verdikt-Cmd liefern")
	}
}

func TestReviewRejectNeedsCommentThenDispatches(t *testing.T) {
	m := reviewModel()
	// x → Eingabemodus
	mi, _ := m.Update(keyMsg("x"))
	m = mi.(model)
	if !m.inputting {
		t.Fatal("'x' sollte inputting=true setzen")
	}
	// leerer Kommentar + enter → kein Dispatch
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if cmd != nil {
		t.Error("leerer Reject-Kommentar darf nicht dispatchen")
	}
	// erneut x, Text tippen, enter → Dispatch
	mi, _ = m.Update(keyMsg("x"))
	m = mi.(model)
	mi, _ = m.Update(keyMsg("bitte fixen"))
	m = mi.(model)
	mi, cmd = m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if cmd == nil {
		t.Error("Reject mit Kommentar sollte dispatchen")
	}
	if m.inputting {
		t.Error("nach enter sollte inputting=false sein")
	}
}

func TestReviewCompleteDoubleConfirm(t *testing.T) {
	m := reviewModel()
	mi, cmd := m.Update(keyMsg("C"))
	m = mi.(model)
	if cmd != nil {
		t.Error("erstes 'C' darf nur bestätigen, nicht dispatchen")
	}
	if !m.confirmComplete {
		t.Error("confirmComplete nicht gesetzt")
	}
	_, cmd = m.Update(keyMsg("C"))
	if cmd == nil {
		t.Error("zweites 'C' sollte den Abschluss dispatchen")
	}
}
