package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestColumnsDOpensDeleteMilestone(t *testing.T) {
	m := columnsModel()
	mi, cmd := m.Update(keyMsg("d"))
	m = mi.(model)
	if !m.delConfirm || m.delKind != "milestone" {
		t.Fatalf("d (depth 0) öffnet keinen Meilenstein-Delete (confirm=%v kind=%q)", m.delConfirm, m.delKind)
	}
	if m.delID != 1 {
		t.Errorf("delID=%d, want 1", m.delID)
	}
	if !m.delLoading {
		t.Error("delLoading sollte true sein (Counts werden geladen)")
	}
	if cmd == nil {
		t.Error("d sollte loadDeletePreview dispatchen")
	}
}

func TestDeletePreviewFillsCounts(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(keyMsg("d"))
	m = mi.(model)
	mi, _ = m.Update(deletePreviewMsg{"milestone", 1, "M1", 2, 7, 0})
	m = mi.(model)
	if m.delLoading {
		t.Error("delLoading sollte nach Preview false sein")
	}
	if m.delSprints != 2 || m.delIssues != 7 {
		t.Errorf("counts sprints=%d issues=%d, want 2/7", m.delSprints, m.delIssues)
	}
}

func TestDeleteConfirmWaitsForCountsThenDispatches(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(keyMsg("d"))
	m = mi.(model)
	// enter während Laden: kein Dispatch, Dialog bleibt (DD2-174)
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if !m.delConfirm {
		t.Error("enter während Laden sollte den Dialog nicht schließen")
	}
	if cmd != nil {
		t.Error("enter während Laden sollte nicht löschen")
	}
	// Counts da → enter löscht
	mi, _ = m.Update(deletePreviewMsg{"milestone", 1, "M1", 2, 7, 0})
	m = mi.(model)
	mi, cmd = m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.delConfirm {
		t.Error("enter nach Laden sollte den Dialog schließen")
	}
	if cmd == nil {
		t.Error("enter nach Laden sollte doCascadeDelete dispatchen")
	}
}

func TestDeleteEscCancels(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(keyMsg("d"))
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.delConfirm {
		t.Error("esc sollte den Lösch-Dialog abbrechen")
	}
}

func TestDeleteDoneReloads(t *testing.T) {
	m := columnsModel()
	m.view = viewMilestone
	mi, cmd := m.Update(deleteDoneMsg{"milestone", 1, "M1"})
	m = mi.(model)
	if m.view != viewTree { // DD2-111: Ranger gesunset → Tree-Primat
		t.Errorf("nach Delete zurück auf Tree, got view=%d", m.view)
	}
	if cmd == nil {
		t.Error("deleteDone sollte Columns neu laden")
	}
	if m.status == "" {
		t.Error("deleteDone sollte einen Hinweis setzen")
	}
}
