package tui

import (
	"testing"
)

// DD2-174: s auf der Meilenstein-Ebene (kein Sprint fokussiert) darf KEIN
// Sprint-Status-Menü öffnen. Die depth-basierten Columns-Sprint-Status-Tests
// sind mit dem Columns-Sunset (DD2-111) entfallen; der Sprint-Status-Pfad läuft
// jetzt über den Tree (s auf Sprint-Knoten) bzw. das Review-Cockpit.
func TestColumnsSmallSDepth0NoMenu(t *testing.T) {
	m := columnsModel()
	m.depth = 0 // Meilenstein-Ebene → s ist hier kein Sprint-Trigger
	mi, _ := m.Update(keyMsg("s"))
	m = mi.(model)
	if m.sprintPick {
		t.Error("s bei depth 0 sollte kein Sprint-Status-Menü öffnen")
	}
}
