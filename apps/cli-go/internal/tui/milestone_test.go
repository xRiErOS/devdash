package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestMilestoneTransitions(t *testing.T) {
	if got := milestoneTransitions["new"]; len(got) != 1 || got[0] != "in_progress" {
		t.Errorf("new → %+v, want [in_progress]", got)
	}
	if got := milestoneTransitions["in_progress"]; len(got) != 1 || got[0] != "completed" {
		t.Errorf("in_progress → %+v, want [completed]", got)
	}
	if len(milestoneTransitions["planned"]) != 0 {
		t.Error("planned sollte keine manuellen Übergänge haben")
	}
}

func TestBrowseSOpensMilestoneStatus(t *testing.T) {
	m := browseModel()
	m.milestones[0].Status = "new"
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if !m.msPick {
		t.Fatal("s (depth 0, DD2-174) öffnet kein Meilenstein-Status-Menü")
	}
	if m.msTargetID != m.milestones[0].ID {
		t.Errorf("msTargetID=%d, want %d", m.msTargetID, m.milestones[0].ID)
	}
}

func TestMilestoneStatusEnterDispatches(t *testing.T) {
	m := browseModel()
	m.milestones[0].Status = "new"
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.msPick {
		t.Error("enter schließt das Menü nicht")
	}
	if cmd == nil {
		t.Error("enter sollte doMilestoneStatus dispatchen")
	}
}

func TestMilestoneStatusNoTransitionNotice(t *testing.T) {
	m := browseModel()
	m.milestones[0].Status = "planned" // nicht in der Transitions-Map
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if m.msPick {
		t.Error("kein Menü bei fehlenden Übergängen")
	}
	if m.toast == nil {
		t.Error("fehlende Übergänge sollten einen Hinweis setzen")
	}
}
