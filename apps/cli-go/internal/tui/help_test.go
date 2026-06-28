package tui

import (
	"strings"
	"testing"
)

// DD2-31: ? öffnet die Shortcut-Übersicht, jede Taste schließt sie wieder.
func TestHelpOverlayToggle(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(keyMsg("?"))
	m = mi.(model)
	if !m.helpOpen {
		t.Fatal("? sollte helpOpen setzen")
	}
	mi, _ = m.Update(keyMsg("x"))
	m = mi.(model)
	if m.helpOpen {
		t.Error("beliebige Taste sollte Hilfe schließen")
	}
}

// Während der Tree-Suche tippt ? als Zeichen — kein Hilfe-Overlay.
func TestHelpNotOpenedDuringSearch(t *testing.T) {
	m := treeModel()
	m.view = viewTree
	m.treeSearching = true
	mi, _ := m.Update(keyMsg("?"))
	m = mi.(model)
	if m.helpOpen {
		t.Error("? während Tree-Suche darf kein Hilfe-Overlay öffnen")
	}
}

// helpBox wird aus der zentralen Keymap generiert: Gruppen-Titel + Tasten-Labels
// stammen aus key.Binding.Help() (Single-Source, DD2-47).
func TestHelpBoxRendersKeymap(t *testing.T) {
	box := columnsModel().helpBox()
	for _, want := range []string{"Tastatur-Shortcuts", "Navigation", "Views & Global", "Aktionen", "↑/i", "?", "Hilfe"} {
		if !strings.Contains(box, want) {
			t.Errorf("helpBox enthält %q nicht", want)
		}
	}
}
