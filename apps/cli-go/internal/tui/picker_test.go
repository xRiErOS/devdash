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
		view:          viewHome,
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

	m2, _ := m.keyHome(down)
	if m2.(model).plist.cursor != 1 {
		t.Errorf("k → cursor=%d, want 1", m2.(model).plist.cursor)
	}
	m3, _ := m2.(model).keyHome(up)
	if m3.(model).plist.cursor != 0 {
		t.Errorf("i → cursor=%d, want 0", m3.(model).plist.cursor)
	}
}

// DD2-124: esc aus der Lobby (viewHome) → Beenden-Confirm (Esc-Spine-Ende).
func TestHomeEscQuits(t *testing.T) {
	m := pickerModel()
	esc := tea.KeyMsg{Type: tea.KeyEsc}
	m2, _ := m.keyHome(esc)
	if !m2.(model).confirmQuit {
		t.Errorf("esc aus Lobby sollte Beenden-Confirm öffnen, confirmQuit=%v", m2.(model).confirmQuit)
	}
}

// DD2-124: esc im projPick-Overlay schließt nur das Overlay (kein View-Wechsel).
func TestProjPickEscCloses(t *testing.T) {
	m := pickerModel()
	m.view = viewTree
	m.projPick = true
	esc := tea.KeyMsg{Type: tea.KeyEsc}
	m2, _ := m.keyProjPick(esc)
	if m2.(model).projPick {
		t.Errorf("esc sollte projPick schließen")
	}
	if m2.(model).view != viewTree {
		t.Errorf("esc im Overlay → view=%d, want viewTree (unverändert)", m2.(model).view)
	}
}

// DD2-124: enter im projPick-Overlay wählt das Projekt und springt in den Tree.
func TestProjPickEnterSelects(t *testing.T) {
	m := pickerModel()
	m.view = viewTree
	m.projPick = true
	m.plist.cursor = 1 // My Baby Tracker
	m2, _ := m.keyProjPick(tea.KeyMsg{Type: tea.KeyEnter})
	m2m := m2.(model)
	if m2m.projPick {
		t.Errorf("enter sollte das Overlay schließen")
	}
	if m2m.view != viewTree {
		t.Errorf("enter → view=%d, want viewTree", m2m.view)
	}
	if m2m.project == nil || m2m.project.ID != 2 {
		t.Errorf("falsches Projekt gewählt: %+v", m2m.project)
	}
}

// Tippen filtert die Liste + setzt cursor zurück (DD2-41).
func TestPickerTypingFilters(t *testing.T) {
	m := pickerModel()
	m.plist.cursor = 2 // irgendwo hin setzen
	typeH := tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("h")}
	m2, _ := m.keyHome(typeH)
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

// openProjPick öffnet das Overlay (kein View-Wechsel) + leert query (DD2-124).
func TestOpenProjPickSetsState(t *testing.T) {
	m := model{
		view:         viewTree,
		projectQuery: "old",
		global:       api.NewClient(""),
	}
	m.projects = []api.Project{{ID: 1, Name: "DD", Prefix: "DD", Slug: "dd"}}
	m.plist.cursor = 2
	m2, cmd := m.openProjPick()
	m2m := m2.(model)
	if !m2m.projPick {
		t.Errorf("projPick=%v, want true", m2m.projPick)
	}
	if m2m.view != viewTree {
		t.Errorf("view=%d, want viewTree (kein Wechsel)", m2m.view)
	}
	if m2m.projectQuery != "" {
		t.Errorf("query=%q, want leer", m2m.projectQuery)
	}
	if m2m.plist.cursor != 0 {
		t.Errorf("cursor=%d, want 0", m2m.plist.cursor)
	}
	if cmd == nil {
		t.Errorf("openProjPick liefert keinen loadProjects-Cmd")
	}
}
