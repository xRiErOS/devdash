package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// --- Flow A: Sprint → Meilenstein ---

func TestSprintDetailMOpensPicker(t *testing.T) {
	m := columnsModel()
	m.view = viewSprint
	mi, _ := m.Update(keyMsg("a")) // DD2-174: Assign=a (war m)
	m = mi.(model)
	if !m.smPick {
		t.Fatal("m in Sprint-Details öffnet keinen Meilenstein-Picker")
	}
	if len(m.smOpts) != 3 { // (kein) + M1 + M2
		t.Errorf("smOpts=%d, want 3", len(m.smOpts))
	}
	if m.smOpts[0].id != nil {
		t.Error("erste Option muss (kein Meilenstein) sein")
	}
	if m.smSprintID != 10 {
		t.Errorf("smSprintID=%d, want 10 (selSprint)", m.smSprintID)
	}
}

func TestSprintMilestonePickerEnterDispatches(t *testing.T) {
	m := columnsModel()
	m.view = viewSprint
	mi, _ := m.Update(keyMsg("a")) // DD2-174: Assign=a (war m)
	m = mi.(model)
	mi, _ = m.Update(keyMsg("k")) // auf erste echte Meilenstein-Option
	m = mi.(model)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.smPick {
		t.Error("enter schließt den Picker nicht")
	}
	if cmd == nil {
		t.Error("enter sollte doSetSprintMilestone dispatchen")
	}
}

// DD2-27: geschlossene/stornierte Meilensteine erscheinen NICHT im Zuweisungs-Picker.
func TestMilestonePickerFiltersClosed(t *testing.T) {
	m := columnsModel()
	m.milestones = append(m.milestones,
		api.Milestone{ID: 3, Name: "M-Done", Status: "completed"},
		api.Milestone{ID: 4, Name: "M-Cancel", Status: "cancelled"},
	)
	opts := m.milestonePickOpts()
	// (kein) + M1(active) + M2(planning) = 3; completed/cancelled raus.
	if len(opts) != 3 {
		t.Fatalf("smOpts=%d, want 3 (kein + 2 offene) — geschlossene nicht gefiltert", len(opts))
	}
	for _, o := range opts {
		if o.id != nil && (*o.id == 3 || *o.id == 4) {
			t.Errorf("geschlossener Meilenstein id=%d im Picker", *o.id)
		}
	}
}

// --- Flow B: Meilenstein → Sprints ---

func TestMilestoneAssignChecklistFlow(t *testing.T) {
	m := columnsModel()
	m.view = viewMilestone
	mi, cmd := m.Update(keyMsg("a"))
	m = mi.(model)
	if !m.maPick {
		t.Fatal("a öffnet keine Sprint-Checkliste")
	}
	if cmd == nil {
		t.Error("a sollte unzugewiesene Sprints laden")
	}
	if m.maMilestoneID != 1 {
		t.Errorf("maMilestoneID=%d, want 1", m.maMilestoneID)
	}
	mi, _ = m.Update(unassignedSprintsMsg{[]api.Sprint{
		{ID: 50, Key: "SPF#9", Name: "X"},
		{ID: 51, Key: "SPF#10", Name: "Y"},
	}})
	m = mi.(model)
	if len(m.maSprints) != 2 || m.maMenu.length != 2 {
		t.Fatalf("maSprints=%d length=%d, want 2/2", len(m.maSprints), m.maMenu.length)
	}
	// space kreuzt den ersten an
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeySpace})
	m = mi.(model)
	if !m.maChecked[50] {
		t.Error("space kreuzt den fokussierten Sprint nicht an")
	}
	// enter weist zu
	mi, cmd = m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.maPick {
		t.Error("enter schließt die Checkliste nicht")
	}
	if cmd == nil {
		t.Error("enter mit Auswahl sollte doAssignSprintsToMilestone dispatchen")
	}
}

func TestMilestoneAssignEnterNoChecksNotice(t *testing.T) {
	m := columnsModel()
	m.view = viewMilestone
	mi, _ := m.Update(keyMsg("a"))
	m = mi.(model)
	mi, _ = m.Update(unassignedSprintsMsg{[]api.Sprint{{ID: 50, Key: "S", Name: "X"}}})
	m = mi.(model)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if cmd != nil {
		t.Error("enter ohne Auswahl sollte nichts dispatchen")
	}
	if m.status == "" {
		t.Error("enter ohne Auswahl sollte einen Hinweis setzen")
	}
}
