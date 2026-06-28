package tui

// DD2-136 (Review-Befund #4): Issue aus dem Backlog einem nicht-finalen Sprint
// (planning/active) zuweisen — Single-Select-Picker, S-Shortcut.

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// assignableSprints filtert auf nicht-finale Sprints (planning/active).
func TestAssignableSprintsFilter(t *testing.T) {
	all := []api.Sprint{
		{ID: 1, Key: "DD2#1", Status: "planning"},
		{ID: 2, Key: "DD2#2", Status: "active"},
		{ID: 3, Key: "DD2#3", Status: "completed"},
		{ID: 4, Key: "DD2#4", Status: "cancelled"},
		{ID: 5, Key: "DD2#5", Status: "review"},
	}
	got := assignableSprints(all)
	if len(got) != 2 {
		t.Fatalf("assignbar=%d, want 2 (planning,active)", len(got))
	}
	for _, s := range got {
		if s.Status != "planning" && s.Status != "active" {
			t.Errorf("finaler Sprint durchgerutscht: %s (%s)", s.Key, s.Status)
		}
	}
}

// S im Backlog öffnet den Sprint-Picker für das selektierte Issue.
func TestBacklogOpenAssignSprint(t *testing.T) {
	m := backlogMDModel()
	mi, _ := m.keyBacklog(key("S"))
	mm := mi.(model)
	if !mm.asPick || mm.asIssueID != 1 {
		t.Fatalf("S → asPick=%v asIssueID=%d, want true/1", mm.asPick, mm.asIssueID)
	}
}

// assignSprintsMsg befüllt die Picker-Liste; enter feuert die Zuweisung.
func TestAssignSprintPickAndFire(t *testing.T) {
	m := backlogMDModel()
	mi, _ := m.keyBacklog(key("S"))
	m = mi.(model)
	mi, _ = m.Update(assignSprintsMsg{items: []api.Sprint{{ID: 9, Key: "DD2#9", Status: "active"}}})
	m = mi.(model)
	if len(m.asSprints) != 1 {
		t.Fatalf("asSprints=%d, want 1", len(m.asSprints))
	}
	md, cmd := m.keyAssignSprint(tea.KeyMsg{Type: tea.KeyEnter})
	if md.(model).asPick {
		t.Error("enter sollte den Picker schließen")
	}
	if cmd == nil {
		t.Error("enter sollte die Zuweisung auslösen")
	}
}

// issueAssignedMsg entfernt das zugewiesene Issue aus dem Backlog (hat jetzt Sprint).
func TestIssueAssignedRemovesFromBacklog(t *testing.T) {
	m := backlogMDModel() // Issues 1,2
	m.detailFocus = true
	mi, _ := m.Update(issueAssignedMsg{issueID: 1, sprintKey: "DD2#9"})
	m = mi.(model)
	for _, it := range m.backlog {
		if it.ID == 1 {
			t.Fatal("zugewiesenes Issue noch im Backlog")
		}
	}
	if m.detailFocus {
		t.Error("Detail-Fokus sollte nach Zuweisung zurückfallen")
	}
}
