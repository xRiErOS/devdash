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
	m.view = viewTree // DD2-111: Columns gesunset — generischer Fixture mit geladenen Meilensteinen
	m.milestones = ms
	m.mlist.setLen(len(ms))
	m.slist.setLen(len(ms[0].Sprints))
	return m
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
