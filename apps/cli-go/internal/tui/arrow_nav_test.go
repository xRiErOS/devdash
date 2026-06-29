package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-71: Echte Pfeiltasten (↑↓←→) müssen in JEDEM View identisch zu den vi-Tasten
// navigieren. Seit dem Split routet jeder Bewegungs-Handler über navKey (DD2-47),
// das Pfeiltasten mitführt — diese Tests sind der Regressions-Beweis und prüfen
// absolute Navigations-Ausgänge (überlebt damit auch die jkli-Umstellung DD2-34).

func up() tea.KeyMsg    { return tea.KeyMsg{Type: tea.KeyUp} }
func down() tea.KeyMsg  { return tea.KeyMsg{Type: tea.KeyDown} }
func left() tea.KeyMsg  { return tea.KeyMsg{Type: tea.KeyLeft} }
func right() tea.KeyMsg { return tea.KeyMsg{Type: tea.KeyRight} }

func step(m model, msg tea.KeyMsg) model {
	mi, _ := m.Update(msg)
	return mi.(model)
}

// Tree (Primat-View): ↓/↑ bewegen den Knoten-Cursor, → expandiert, ← kollabiert.
func TestArrowTreeNav(t *testing.T) {
	m := treeModel()
	m.view = viewTree
	m.treeExpMile[1] = true // [mile, s10, s11] → 3 Knoten
	m = step(m, down())
	if m.treeCursor != 1 {
		t.Fatalf("↓ treeCursor=%d, want 1", m.treeCursor)
	}
	m = step(m, down())
	if m.treeCursor != 2 {
		t.Errorf("↓ treeCursor=%d, want 2", m.treeCursor)
	}
	m = step(m, up())
	if m.treeCursor != 1 {
		t.Errorf("↑ treeCursor=%d, want 1", m.treeCursor)
	}
}

// Detail-Fokus-Maschine: ↓/↑ bewegen die Section, → geht in die Feld-Ebene,
// ← wieder zurück.
func TestArrowDetailFocusNav(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Fokus in die Detail-Pane
	m = mi.(model)
	if !m.detailFocus {
		t.Fatal("Setup: detailFocus nicht gesetzt")
	}
	m = step(m, down())
	if m.secCursor != 1 {
		t.Fatalf("↓ secCursor=%d, want 1", m.secCursor)
	}
	m = step(m, right())
	if m.detailLevel != 1 {
		t.Errorf("→ detailLevel=%d, want 1 (Feld-Ebene)", m.detailLevel)
	}
	m = step(m, left())
	if m.detailLevel != 0 {
		t.Errorf("← detailLevel=%d, want 0", m.detailLevel)
	}
	m = step(m, up())
	if m.secCursor != 0 {
		t.Errorf("↑ secCursor=%d, want 0", m.secCursor)
	}
}

// Memory-Browser: ↓/↑ bewegen die Liste (navKey-Routing in keyMemory).
func TestArrowMemoryNav(t *testing.T) {
	m := memModel()
	mi, _ := m.Update(memoriesMsg{[]api.ProjectMemory{
		{ID: 1, Category: "convention", Summary: "A"},
		{ID: 2, Category: "bug_pattern", Summary: "B"},
	}})
	m = mi.(model)
	m = step(m, down())
	if m.memlist.cursor != 1 {
		t.Fatalf("↓ memlist.cursor=%d, want 1", m.memlist.cursor)
	}
	m = step(m, up())
	if m.memlist.cursor != 0 {
		t.Errorf("↑ memlist.cursor=%d, want 0", m.memlist.cursor)
	}
}

// Projekt-Picker: ↓ bewegt die Projektliste.
func TestArrowPickerNav(t *testing.T) {
	m := newModel(nil, nil, api.NewClient(""))
	mi, _ := m.Update(projectsMsg{[]api.Project{
		{ID: 1, Slug: "a", Prefix: "A"},
		{ID: 2, Slug: "b", Prefix: "B"},
	}})
	m = mi.(model)
	m = step(m, down())
	if m.plist.cursor != 1 {
		t.Errorf("↓ plist.cursor=%d, want 1", m.plist.cursor)
	}
}
