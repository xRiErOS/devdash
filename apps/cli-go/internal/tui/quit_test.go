package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

// isQuit prüft, ob ein Cmd das tea.Quit-Signal trägt.
func isQuit(cmd tea.Cmd) bool {
	if cmd == nil {
		return false
	}
	_, ok := cmd().(tea.QuitMsg)
	return ok
}

// DD2-124: q aus einer Projekt-View landet in der Lobby (nicht Quit-Confirm). Erst
// q/esc AUF der Lobby öffnet den Beenden-Confirm (DD2-49); y/enter beendet, n/esc bricht ab.
func TestQuitConfirmFlow(t *testing.T) {
	m := columnsModel()

	// q in Columns → Lobby, kein Confirm/Quit
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewHome {
		t.Fatalf("q in Columns → view=%d, want viewHome", m.view)
	}
	if m.confirmQuit || isQuit(cmd) {
		t.Fatal("q in Columns darf nicht beenden/confirmen")
	}

	// q in der Lobby → Confirm offen
	mi, cmd = m.Update(keyMsg("q"))
	m = mi.(model)
	if !m.confirmQuit || isQuit(cmd) {
		t.Fatalf("q in Lobby sollte Confirm öffnen (confirmQuit=%v)", m.confirmQuit)
	}

	// n → abbrechen
	mi, _ = m.Update(keyMsg("n"))
	m = mi.(model)
	if m.confirmQuit {
		t.Error("n sollte confirmQuit zurücksetzen")
	}

	// q, dann esc → abbrechen
	mi, _ = m.Update(keyMsg("q"))
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.confirmQuit {
		t.Error("esc sollte confirmQuit zurücksetzen")
	}

	// q, dann y → beenden
	mi, _ = m.Update(keyMsg("q"))
	m = mi.(model)
	_, cmd = m.Update(keyMsg("y"))
	if !isQuit(cmd) {
		t.Error("y im Confirm sollte tea.Quit auslösen")
	}
}

// ctrl+c verhält sich identisch: erst Confirm, dann y beendet.
func TestQuitConfirmCtrlC(t *testing.T) {
	m := columnsModel()
	mi, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlC})
	m = mi.(model)
	if !m.confirmQuit || isQuit(cmd) {
		t.Fatalf("ctrl+c sollte Confirm öffnen, nicht beenden (confirmQuit=%v)", m.confirmQuit)
	}
	_, cmd = m.Update(keyMsg("y"))
	if !isQuit(cmd) {
		t.Error("y nach ctrl+c sollte beenden")
	}
}

// DD2-124: q im Tree-View landet in der Lobby (q/esc-Spine). ctrl+c bleibt der
// harte Beenden-Pfad (Confirm).
func TestQuitConfirmFromTree(t *testing.T) {
	m := treeModel()
	m.view = viewTree
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewHome || m.confirmQuit || isQuit(cmd) {
		t.Fatalf("q im Tree → Lobby erwartet (view=%d confirmQuit=%v)", m.view, m.confirmQuit)
	}
	// ctrl+c → Confirm
	m2 := treeModel()
	m2.view = viewTree
	mi2, _ := m2.Update(tea.KeyMsg{Type: tea.KeyCtrlC})
	if !mi2.(model).confirmQuit {
		t.Errorf("ctrl+c im Tree sollte Confirm öffnen")
	}
}

// Sub-Modal (Cascade-Delete-Confirm) fängt q selbst ab und bricht ab — KEIN
// zweiter Beenden-Prompt darüber.
func TestQuitNotTriggeredInSubModal(t *testing.T) {
	m := columnsModel()
	m.delConfirm = true // simuliert offenen Delete-Dialog
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.confirmQuit {
		t.Error("q im Delete-Dialog darf keinen Beenden-Confirm öffnen")
	}
	if m.delConfirm {
		t.Error("q sollte den Delete-Dialog abbrechen")
	}
	if isQuit(cmd) {
		t.Error("q im Delete-Dialog darf nicht beenden")
	}
}
