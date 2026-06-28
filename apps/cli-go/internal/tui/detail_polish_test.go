package tui

// DD2-77 Review-Befund + DD2-86: vollständiger Prioritäts-Select (P1..P5) und
// enter-Shortcut im Detail-Fokus-Footer.

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
)

// priorityOptions deckt den vollen Contract-Bereich 1..5 ab (vorher fehlte P5 →
// "nicht alle Prioritäten zur Auswahl"). typeOptions = die vier Issue-Typen.
func TestPriorityOptionsComplete(t *testing.T) {
	if got := len(priorityOptions()); got != 5 {
		t.Errorf("priorityOptions = %d, want 5 (P1..P5)", got)
	}
	if got := len(typeOptions()); got != 4 {
		t.Errorf("typeOptions = %d, want 4", got)
	}
}

// Die gerenderte Priority-editField-Form zeigt ALLE Stufen P1..P5 (PO-Befund:
// P1/P2 fehlten). Direkter Augenschein-Ersatz über huh Form.View().
func TestEditPriorityFormShowsAllLevels(t *testing.T) {
	f := buildEditFieldForm(detailField{key: "priority", label: "Priority", editor: "select"}, "2")
	f.Init()
	view := ansi.Strip(f.View())
	for _, p := range []string{"P1", "P2", "P3", "P4", "P5"} {
		if !strings.Contains(view, p) {
			t.Errorf("Priorität-Form ohne %s:\n%s", p, view)
		}
	}
}

// DD2-86: bei Detail-Fokus muss der Footer (lokale Shortcuts) enter ausweisen —
// enter steigt in die Section bzw. öffnet die Bearbeiten-Form.
func TestDetailFocusHintShowsEnter(t *testing.T) {
	m := detailFocusModel()
	m.width, m.height = 120, 30
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // → Detail-Fokus
	m = mi.(model)
	_, localKeys, _, _, _ := m.treeLayout()
	if !strings.Contains(ansi.Strip(localKeys), "enter") {
		t.Errorf("Detail-Fokus-Hint ohne enter: %q", ansi.Strip(localKeys))
	}
}

// Gegenprobe: ohne Detail-Fokus (normaler Tree) bleibt der Hint die Tree-Navigation.
func TestTreeHintNoDetailEnter(t *testing.T) {
	m := detailFocusModel()
	m.width, m.height = 120, 30
	_, localKeys, _, _, _ := m.treeLayout()
	if strings.Contains(ansi.Strip(localKeys), "bearbeiten") {
		t.Errorf("Tree-Hint sollte keinen Detail-enter zeigen: %q", ansi.Strip(localKeys))
	}
}
