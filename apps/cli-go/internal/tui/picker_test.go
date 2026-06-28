package tui

// picker_test.go — DD2-41: Project-Switch-Picker Verhaltenstests.
// State/Update-Ebene: Tasten → Modell-Transitionen, Filter-Logik, Navigation.

import (
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

func pickerModel() model {
	ti := textinput.New()
	m := model{
		projects: []api.Project{
			{ID: 1, Name: "Developer Dashboard", Prefix: "DD2", Slug: "devd2"},
			{ID: 2, Name: "My Baby Tracker", Prefix: "MBT", Slug: "mybaby"},
			{ID: 3, Name: "Home Dashboard", Prefix: "HD", Slug: "home"},
		},
		view:          viewPicker,
		projectSearch: ti,
	}
	m.plist.setLen(len(m.projects))
	return m
}

// filteredProjects gibt leere Slice zurück wenn kein Match (DD2-41).
func TestFilteredProjectsEmpty(t *testing.T) {
	m := pickerModel()
	m.projectQuery = "zzznomatch"
	if got := m.filteredProjects(); len(got) != 0 {
		t.Errorf("filteredProjects mit kein-Match = %d, want 0", len(got))
	}
}

// filteredProjects matched auf Name, Prefix, Slug — case-insensitiv (DD2-41).
func TestFilteredProjectsMatch(t *testing.T) {
	m := pickerModel()

	m.projectQuery = "baby"
	if got := m.filteredProjects(); len(got) != 1 || got[0].Prefix != "MBT" {
		t.Errorf("baby → %d Treffer (want 1 MBT): %v", len(got), got)
	}

	m.projectQuery = "DD2"
	if got := m.filteredProjects(); len(got) != 1 || got[0].Prefix != "DD2" {
		t.Errorf("DD2 (prefix) → %d Treffer (want 1): %v", len(got), got)
	}

	m.projectQuery = "devd2"
	if got := m.filteredProjects(); len(got) != 1 || got[0].Slug != "devd2" {
		t.Errorf("devd2 (slug) → %d Treffer (want 1): %v", len(got), got)
	}
}

// filteredProjects ohne Query gibt alle zurück (DD2-41).
func TestFilteredProjectsNoQuery(t *testing.T) {
	m := pickerModel()
	m.projectQuery = ""
	if got := m.filteredProjects(); len(got) != 3 {
		t.Errorf("kein Filter → %d (want 3)", len(got))
	}
}

// i=↑ k=↓ navigiert in der gefilterten Liste (DD2-41, Keymap: i/k = hoch/runter).
func TestPickerArrowNav(t *testing.T) {
	m := pickerModel()
	down := tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("k")} // k = Down (Keymap)
	up := tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("i")}   // i = Up (Keymap)

	m2, _ := m.updatePickerMsg(down)
	if m2.(model).plist.cursor != 1 {
		t.Errorf("k → cursor=%d, want 1", m2.(model).plist.cursor)
	}
	m3, _ := m2.(model).updatePickerMsg(up)
	if m3.(model).plist.cursor != 0 {
		t.Errorf("i → cursor=%d, want 0", m3.(model).plist.cursor)
	}
}

// esc schließt Picker, kehrt zu viewTree zurück wenn Projekt gesetzt (DD2-41).
func TestPickerEscWithProject(t *testing.T) {
	m := pickerModel()
	proj := m.projects[0]
	m.project = &proj
	esc := tea.KeyMsg{Type: tea.KeyEsc}
	m2, _ := m.updatePickerMsg(esc)
	if m2.(model).view != viewTree {
		t.Errorf("esc mit Projekt → view=%d, want viewTree", m2.(model).view)
	}
	if m2.(model).projectQuery != "" {
		t.Errorf("esc → query sollte leer sein, got %q", m2.(model).projectQuery)
	}
}

// esc ohne Projekt (startup) bleibt im Picker (DD2-41).
func TestPickerEscWithoutProject(t *testing.T) {
	m := pickerModel()
	m.project = nil
	esc := tea.KeyMsg{Type: tea.KeyEsc}
	m2, _ := m.updatePickerMsg(esc)
	if m2.(model).view != viewPicker {
		t.Errorf("esc ohne Projekt → view=%d, want viewPicker", m2.(model).view)
	}
}

// Tippen filtert die Liste + setzt cursor zurück (DD2-41).
func TestPickerTypingFilters(t *testing.T) {
	m := pickerModel()
	m.plist.cursor = 2 // irgendwo hin setzen
	typeH := tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("h")}
	m2, _ := m.updatePickerMsg(typeH)
	m2m := m2.(model)
	// "h" matcht "Home Dashboard" + "My Baby Tracker" (Slug: mybaby, enthält kein h)
	// → "Home Dashboard" (HD, home slug)
	if m2m.projectQuery != "h" {
		t.Errorf("tippen → query=%q, want h", m2m.projectQuery)
	}
	if m2m.plist.cursor != 0 {
		t.Errorf("tippen → cursor=%d, want 0 (reset)", m2m.plist.cursor)
	}
}

// openProjectPicker setzt view + leert query (DD2-41).
func TestOpenProjectPickerSetsState(t *testing.T) {
	m := model{
		view:         viewTree,
		projectQuery: "old",
		global:       api.NewClient(""),
	}
	m.projects = []api.Project{{ID: 1, Name: "DD", Prefix: "DD", Slug: "dd"}}
	m.plist.cursor = 2
	m2, cmd := m.openProjectPicker()
	m2m := m2.(model)
	if m2m.view != viewPicker {
		t.Errorf("view=%d, want viewPicker", m2m.view)
	}
	if m2m.projectQuery != "" {
		t.Errorf("query=%q, want leer", m2m.projectQuery)
	}
	if m2m.plist.cursor != 0 {
		t.Errorf("cursor=%d, want 0", m2m.plist.cursor)
	}
	if cmd == nil {
		t.Errorf("openProjectPicker liefert keinen loadProjects-Cmd")
	}
}
