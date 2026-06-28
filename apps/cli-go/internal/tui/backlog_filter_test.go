package tui

// DD2-46: Im Backlog suchen (/), filtern (f) und sortieren (s) — client-seitig über
// die geladene Backlog-Slice, ohne den Screen zu verlassen.

import (
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

func backlogFilterModel() model {
	c1, c2, c3 := "2026-06-01", "2026-06-20", "2026-06-10"
	m := model{
		view: viewBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "Login bauen", Type: "feature", Priority: 3, Status: "new", CreatedAt: &c1},
			{ID: 2, Key: "DD2-2", Title: "Crash beheben", Type: "bug", Priority: 1, Status: "planned", CreatedAt: &c2},
			{ID: 3, Key: "DD2-3", Title: "Login-Bug", Type: "bug", Priority: 2, Status: "new", CreatedAt: &c3},
		},
		blAccOpen: 1,
	}
	m.blSearch = textinput.New()
	return m
}

// S1: Freitext-Suche filtert über Key+Titel (case-insensitive).
func TestBacklogVisibleSearch(t *testing.T) {
	m := backlogFilterModel()
	m.blQuery = "login"
	vis := m.backlogVisible()
	if len(vis) != 2 {
		t.Fatalf("Suche 'login' → %d Treffer, want 2 (DD2-1, DD2-3)", len(vis))
	}
}

// S2: Facetten-Filter Type — nur gesetzte Typen bleiben.
func TestBacklogVisibleTypeFilter(t *testing.T) {
	m := backlogFilterModel()
	m.blfType = map[string]bool{"bug": true}
	vis := m.backlogVisible()
	if len(vis) != 2 {
		t.Fatalf("Filter type=bug → %d, want 2", len(vis))
	}
	for _, it := range vis {
		if it.Type != "bug" {
			t.Errorf("nicht-bug durchgerutscht: %s", it.Key)
		}
	}
}

// S2: Facetten-Filter Status kombiniert mit Suche.
func TestBacklogVisibleStatusAndSearch(t *testing.T) {
	m := backlogFilterModel()
	m.blfStatus = map[string]bool{"new": true}
	m.blQuery = "login"
	vis := m.backlogVisible()
	if len(vis) != 2 { // DD2-1 (new, "Login bauen") + DD2-3 (new, "Login-Bug")
		t.Fatalf("status=new + 'login' → %d, want 2", len(vis))
	}
}

// S3: Sortierung — Priorität (1 zuerst), Erstelldatum (neueste zuerst), Key (id).
func TestBacklogSort(t *testing.T) {
	m := backlogFilterModel()
	m.blSort = "prio"
	if got := m.backlogVisible()[0].Key; got != "DD2-2" {
		t.Errorf("prio[0]=%s, want DD2-2 (P1)", got)
	}
	m.blSort = "created"
	if got := m.backlogVisible()[0].Key; got != "DD2-2" {
		t.Errorf("created[0]=%s, want DD2-2 (2026-06-20 neueste)", got)
	}
	m.blSort = "key"
	if got := m.backlogVisible()[0].Key; got != "DD2-1" {
		t.Errorf("key[0]=%s, want DD2-1 (id asc)", got)
	}
}

// S1: `/` öffnet die Suche, enter übernimmt, esc löscht.
func TestBacklogSearchOpenCommitClear(t *testing.T) {
	mi, _ := backlogFilterModel().keyBacklog(key("/"))
	m := mi.(model)
	if !m.blSearching {
		t.Fatal("/ sollte die Suche öffnen")
	}
	m.blSearch.SetValue("bug")
	mi, _ = m.keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.blSearching || m.blQuery != "bug" {
		t.Errorf("enter → searching=%v query=%q, want false/\"bug\"", m.blSearching, m.blQuery)
	}
	// esc bei aktiver Suche löscht den Filter.
	mi, _ = m.keyBacklog(key("/"))
	mi, _ = mi.(model).keyBacklog(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.blSearching || m.blQuery != "" {
		t.Errorf("esc → searching=%v query=%q, want false/\"\"", m.blSearching, m.blQuery)
	}
}

// S2: `f` öffnet das Facetten-Menü, space toggelt, enter schließt.
func TestBacklogFilterToggle(t *testing.T) {
	mi, _ := backlogFilterModel().keyBacklog(key("f"))
	m := mi.(model)
	if !m.blFilterOpen {
		t.Fatal("f sollte das Filter-Menü öffnen")
	}
	if len(m.blfItems) == 0 {
		t.Fatal("Filter-Menü sollte Facetten-Items haben")
	}
	// Cursor auf das erste Type-Item setzen und togglen.
	for i, it := range m.blfItems {
		if it.facet == "type" && it.value == "bug" {
			m.blfMenu.cursor = i
		}
	}
	mi, _ = m.keyBacklog(key(" "))
	m = mi.(model)
	if !m.blfType["bug"] {
		t.Error("space sollte type=bug aktivieren")
	}
	mi, _ = m.keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	if mi.(model).blFilterOpen {
		t.Error("enter sollte das Filter-Menü schließen")
	}
}

// S3: `s` öffnet den Sortier-Picker, enter wählt.
func TestBacklogSortPicker(t *testing.T) {
	mi, _ := backlogFilterModel().keyBacklog(key("s"))
	m := mi.(model)
	if !m.blSortOpen {
		t.Fatal("s sollte den Sortier-Picker öffnen")
	}
	// Auf "created" navigieren (Index 1) und wählen.
	m.blSortMenu.cursor = 1
	mi, _ = m.keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.blSortOpen {
		t.Error("enter sollte den Picker schließen")
	}
	if m.blSort != "created" {
		t.Errorf("blSort=%q, want created", m.blSort)
	}
}
