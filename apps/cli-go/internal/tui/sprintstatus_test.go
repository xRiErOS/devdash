package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestColumnsSmallSOpensSprintStatus(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Sprints[0].Status = "active"
	m.depth = 1
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if !m.sprintPick {
		t.Fatal("s (depth 1) öffnet kein Sprint-Status-Menü")
	}
	if m.spTargetID != 10 {
		t.Errorf("spTargetID=%d, want 10 (selSprint)", m.spTargetID)
	}
	if m.spCurStatus != "active" {
		t.Errorf("spCurStatus=%q, want active", m.spCurStatus)
	}
}

func TestColumnsSmallSDepth0NoMenu(t *testing.T) {
	m := columnsModel()
	m.depth = 0 // Meilenstein-Ebene → s ist hier kein Sprint-Trigger
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if m.sprintPick {
		t.Error("s bei depth 0 sollte kein Sprint-Status-Menü öffnen")
	}
}

func TestColumnsSprintStatusEnterDispatches(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Sprints[0].Status = "active"
	m.depth = 1
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.sprintPick {
		t.Error("enter schließt das Menü nicht")
	}
	if cmd == nil {
		t.Error("enter sollte doSprintTo (+ Columns-Reload) dispatchen")
	}
}

func TestColumnsSprintStatusNoTransitionNotice(t *testing.T) {
	m := columnsModel()
	m.milestones[0].Sprints[0].Status = "closed" // terminal, keine Übergänge, nicht default-gefiltert
	m.depth = 1
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if m.sprintPick {
		t.Error("kein Menü bei fehlenden Übergängen")
	}
	if m.status == "" {
		t.Error("fehlende Übergänge sollten einen Hinweis setzen")
	}
}
