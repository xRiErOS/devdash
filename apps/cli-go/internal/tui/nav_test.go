package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func keyMsg(s string) tea.KeyMsg {
	return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)}
}

func columnsModel() model {
	ms := []api.Milestone{
		{ID: 1, Name: "M1", Status: "in_progress", Sprints: []api.Sprint{{ID: 10, Key: "SPF#1"}, {ID: 11, Key: "SPF#2"}}},
		{ID: 2, Name: "M2", Status: "new", Sprints: []api.Sprint{{ID: 20, Key: "SPF#3"}}},
	}
	m := newModel(api.NewClient("9"), &api.Project{ID: 9, Slug: "sprout", Prefix: "SPF"}, nil)
	m.view = viewColumns
	m.milestones = ms
	m.mlist.setLen(len(ms))
	m.slist.setLen(len(ms[0].Sprints))
	return m
}

func TestRangerDrillAndBack(t *testing.T) {
	m := columnsModel()

	// l → depth 1 (Fokus Sprints)
	mi, _ := m.Update(keyMsg("l"))
	m = mi.(model)
	if m.depth != 1 {
		t.Fatalf("nach 'l' depth=%d, want 1", m.depth)
	}

	// k → Sprint-Cursor 1 (jkli: k=runter)
	mi, _ = m.Update(keyMsg("k"))
	m = mi.(model)
	if m.slist.cursor != 1 {
		t.Errorf("slist.cursor=%d, want 1", m.slist.cursor)
	}

	// j → zurück auf depth 0 (jkli: j=links/zurück)
	mi, _ = m.Update(keyMsg("j"))
	m = mi.(model)
	if m.depth != 0 {
		t.Errorf("nach 'j' depth=%d, want 0", m.depth)
	}
}

func TestDepthClamps(t *testing.T) {
	m := columnsModel()
	// 5x rein → max depth 2
	for i := 0; i < 5; i++ {
		mi, _ := m.Update(keyMsg("l"))
		m = mi.(model)
	}
	if m.depth != 2 {
		t.Errorf("depth=%d, want clamp 2", m.depth)
	}
	// 5x raus (j=links/zurück) → min depth 0
	for i := 0; i < 5; i++ {
		mi, _ := m.Update(keyMsg("j"))
		m = mi.(model)
	}
	if m.depth != 0 {
		t.Errorf("depth=%d, want clamp 0", m.depth)
	}
}

func TestMilestoneMoveResetsSprintCursor(t *testing.T) {
	m := columnsModel()
	// auf depth 1 Sprint-Cursor bewegen
	mi, _ := m.Update(keyMsg("l"))
	m = mi.(model)
	mi, _ = m.Update(keyMsg("k"))
	m = mi.(model)
	if m.slist.cursor != 1 {
		t.Fatalf("setup: slist.cursor=%d", m.slist.cursor)
	}
	// zurück auf depth 0, anderen Meilenstein wählen → Sprint-Cursor reset
	mi, _ = m.Update(keyMsg("j"))
	m = mi.(model)
	mi, _ = m.Update(keyMsg("k"))
	m = mi.(model)
	if m.mlist.cursor != 1 {
		t.Fatalf("mlist.cursor=%d, want 1", m.mlist.cursor)
	}
	if m.slist.cursor != 0 {
		t.Errorf("slist.cursor nach Meilenstein-Wechsel = %d, want 0 (reset)", m.slist.cursor)
	}
}

func TestPickerSelectSwitchesView(t *testing.T) {
	m := newModel(nil, nil, api.NewClient(""))
	if m.view != viewHome {
		t.Fatal("Start nicht in der Lobby (viewHome)")
	}
	mi, _ := m.Update(projectsMsg{[]api.Project{{ID: 9, Slug: "sprout", Prefix: "SPF"}}})
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.view != viewTree { // DD2-61: Picker führt in den Primat-View (Tree)
		t.Errorf("nach Auswahl view=%d, want viewTree", m.view)
	}
	if m.project == nil || m.project.ID != 9 {
		t.Errorf("Projekt nicht gesetzt: %+v", m.project)
	}
}
