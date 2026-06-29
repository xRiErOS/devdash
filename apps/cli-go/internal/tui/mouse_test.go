package tui

// DD2-51: Maus-Bedienung. Wheel scrollt (Tree-Cursor / m.scroll), Linksklick setzt
// Cursor (Tree, Y-Mapping) bzw. Pane-Fokus (Ranger-Columns, X-Mapping). Golden #3.

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func wheel(b tea.MouseButton) tea.MouseMsg {
	return tea.MouseMsg{Button: b, Action: tea.MouseActionPress}
}
func click(x, y int) tea.MouseMsg {
	return tea.MouseMsg{Button: tea.MouseButtonLeft, Action: tea.MouseActionPress, X: x, Y: y}
}

func TestMouseWheelMovesTreeCursor(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true // 3 Knoten: M1, S1, S2
	m.view = viewTree

	down, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	m = down.(model)
	if m.treeCursor != 1 {
		t.Fatalf("Wheel-Down → cursor=%d, want 1", m.treeCursor)
	}
	up, _ := m.handleMouse(wheel(tea.MouseButtonWheelUp))
	if up.(model).treeCursor != 0 {
		t.Errorf("Wheel-Up → cursor=%d, want 0", up.(model).treeCursor)
	}
}

func TestMouseWheelScrollsDetailBody(t *testing.T) {
	m := treeModel()
	m.view = viewDetail

	down, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	m = down.(model)
	if m.scroll != 3 {
		t.Fatalf("Wheel-Down → scroll=%d, want 3", m.scroll)
	}
	m.scroll = 0
	up, _ := m.handleMouse(wheel(tea.MouseButtonWheelUp))
	if up.(model).scroll != 0 {
		t.Errorf("Wheel-Up an Position 0 → scroll=%d, want 0 (geklemmt)", up.(model).scroll)
	}
}

func TestMouseClickSetsTreeCursor(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.view = viewTree
	m.width, m.height = 90, 22

	head, _, _, _, _ := m.treeLayout()
	firstRowY := lipgloss.Height(head) + 2 // + obere Border + Such-Kopfzeile
	// Klick auf die zweite Baumzeile (Index 1 = Sprint S1), linke Spalte.
	mi, _ := m.handleMouse(click(2, firstRowY+1))
	if got := mi.(model).treeCursor; got != 1 {
		t.Errorf("Klick auf Zeile 1 → cursor=%d, want 1", got)
	}
}

func TestMouseClickRightPaneIgnored(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.view = viewTree
	m.width, m.height = 90, 22
	_, _, lw, _, _ := m.treeLayout()

	mi, _ := m.handleMouse(click(lw+5, 5)) // rechte Detail-Spalte
	if got := mi.(model).treeCursor; got != 0 {
		t.Errorf("Klick rechts sollte Cursor nicht ändern, got %d", got)
	}
}

func TestMouseIgnoredWhenSearching(t *testing.T) {
	m := treeModel()
	m.treeExpMile[1] = true
	m.view = viewTree
	m.treeSearching = true // Suche aktiv → Maus inert

	mi, _ := m.handleMouse(wheel(tea.MouseButtonWheelDown))
	if got := mi.(model).treeCursor; got != 0 {
		t.Errorf("bei aktiver Suche sollte Wheel ignoriert werden, cursor=%d", got)
	}
}
