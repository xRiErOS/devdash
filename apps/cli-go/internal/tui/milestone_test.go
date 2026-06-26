package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestMilestoneTransitions(t *testing.T) {
	if got := milestoneTransitions["planning"]; len(got) != 1 || got[0] != "active" {
		t.Errorf("planning → %+v, want [active]", got)
	}
	if got := milestoneTransitions["active"]; len(got) != 1 || got[0] != "completed" {
		t.Errorf("active → %+v, want [completed]", got)
	}
	if len(milestoneTransitions["closed"]) != 0 {
		t.Error("closed sollte keine Übergänge haben")
	}
}

func TestColumnsSOpensMilestoneStatus(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Status = "planning"
	mi, _ := m.Update(keyMsg("S"))
	m = mi.(model)
	if !m.msPick {
		t.Fatal("S (depth 0) öffnet kein Meilenstein-Status-Menü")
	}
	if m.msTargetID != m.milestones[0].ID {
		t.Errorf("msTargetID=%d, want %d", m.msTargetID, m.milestones[0].ID)
	}
}

func TestColumnsSDepth1NoMenu(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Status = "planning"
	m.depth = 1
	mi, _ := m.Update(keyMsg("S"))
	m = mi.(model)
	if m.msPick {
		t.Error("S bei depth>0 sollte kein Meilenstein-Menü öffnen (Sprint-Ebene)")
	}
}

func TestMilestoneStatusEnterDispatches(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Status = "planning"
	mi, _ := m.Update(keyMsg("S"))
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
	m := columnsModel()
	m.milestones[0].Status = "closed" // nicht in der Transitions-Map
	mi, _ := m.Update(keyMsg("S"))
	m = mi.(model)
	if m.msPick {
		t.Error("kein Menü bei fehlenden Übergängen")
	}
	if m.status == "" {
		t.Error("fehlende Übergänge sollten einen Hinweis setzen")
	}
}
