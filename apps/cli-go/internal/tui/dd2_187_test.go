package tui

// DD2-187: 'alt+enter' darf keine Feldinhalte löschen. Ursache war, dass der
// alt+enter-Intercept submitForm() direkt rief und damit huh's Field-Commit
// umging (f.results füllt sich erst bei nextFieldMsg/StateCompleted) → GetString
// las "" → leeres Save löschte das Feld. Fix: alt+enter wird wie enter an huh
// weitergereicht. Diese Tests sichern, dass alt+enter NICHT mehr den direkten
// submitForm-Kurzschluss nimmt (Form bleibt von huh getrieben).

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

// alt+enter auf einem editField nimmt denselben Weg wie enter: huh verarbeitet
// die Taste (Form bleibt zunächst offen / nicht durch direkten submitForm
// kurzgeschlossen). Der alte Pfad hätte m.form sofort genullt UND einen Save-Cmd
// mit leerem Wert geliefert.
func TestAltEnterBehavesLikeEnterOnEditField(t *testing.T) {
	open := func() model {
		m := treeModel()
		mi, _ := m.openEditFieldGeneric("issue", 55, detailField{key: "po_notes", label: "PO-Notes", editor: "text"}, "bestand")
		return mi.(model)
	}

	mAlt := open()
	altRes, _ := mAlt.Update(tea.KeyMsg{Type: tea.KeyEnter, Alt: true})
	mEnter := open()
	enterRes, _ := mEnter.Update(tea.KeyMsg{Type: tea.KeyEnter})

	// Beide Wege müssen denselben Form-Zustand erzeugen (alt+enter == enter).
	if (altRes.(model).form == nil) != (enterRes.(model).form == nil) {
		t.Errorf("alt+enter (form==nil=%v) weicht von enter (form==nil=%v) ab — soll identisch sein",
			altRes.(model).form == nil, enterRes.(model).form == nil)
	}
}

// Regressionsanker: der direkte alt+enter→submitForm-Kurzschluss ist weg. Für ein
// einzelnes Text-editField gibt huh die Vervollständigung als Cmd zurück und nullt
// die Form NICHT schon im selben Update — der alte Pfad tat genau das (Datenverlust).
func TestAltEnterDoesNotShortCircuitSubmit(t *testing.T) {
	m := treeModel()
	mi, _ := m.openEditFieldGeneric("issue", 55, detailField{key: "po_notes", label: "PO-Notes", editor: "text"}, "bestand")
	m = mi.(model)
	res, _ := m.Update(tea.KeyMsg{Type: tea.KeyEnter, Alt: true})
	if res.(model).form == nil {
		t.Error("alt+enter hat die Form sofort genullt (alter direkter submitForm-Pfad) — erwartet: huh treibt die Vervollständigung")
	}
}
