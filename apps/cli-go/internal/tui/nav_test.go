package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func keyMsg(s string) tea.KeyMsg {
	return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)}
}

func browseModel() model {
	ms := []api.Milestone{
		{ID: 1, Name: "M1", Status: "in_progress", Sprints: []api.Sprint{{ID: 10, Key: "SPF#1"}, {ID: 11, Key: "SPF#2"}}},
		{ID: 2, Name: "M2", Status: "new", Sprints: []api.Sprint{{ID: 20, Key: "SPF#3"}}},
	}
	m := newModel(api.NewClient("9"), &api.Project{ID: 9, Slug: "sprout", Prefix: "SPF"}, nil)
	m.view = viewBrowseProject // DD2-111: Columns gesunset — generischer Fixture mit geladenen Meilensteinen
	m.milestones = ms
	m.mlist.setLen(len(ms))
	m.slist.setLen(len(ms[0].Sprints))
	return m
}

// TestQLeavesToBrowseProject sichert DD2-188: q verlässt eine Funktions-/Detail-View
// zum Project-Browser (Zentrum), nicht bis zur Lobby (viewHome).
func TestQLeavesToBrowseProject(t *testing.T) {
	for _, v := range []viewID{viewDetailIssue, viewDetailMilestone, viewDetailSprint, viewBrowseBacklog} {
		m := columnsModel()
		m.view = v
		mi, _ := m.Update(keyMsg("q"))
		m = mi.(model)
		if m.view != viewBrowseProject {
			t.Errorf("q aus view=%d → view=%d, want viewBrowseProject (DD2-188)", v, m.view)
		}
	}
}

// TestRouteHistoryBackForward sichert DD2-184: View-Wechsel füllt die Routen-
// History; alt+links springt zurück, alt+rechts wieder vor.
func TestRouteHistoryBackForward(t *testing.T) {
	m := columnsModel() // viewBrowseProject, Meilensteine geladen
	// b öffnet das Backlog → Route-Eintrag browseProject.
	mi, _ := m.Update(keyMsg("b"))
	m = mi.(model)
	if m.view != viewBrowseBacklog {
		t.Fatalf("b → view=%d, want viewBrowseBacklog", m.view)
	}
	if len(m.navBack) != 1 || m.navBack[0] != viewBrowseProject {
		t.Fatalf("navBack=%v, want [viewBrowseProject]", m.navBack)
	}
	// alt+links → zurück zum Project-Browser, Backlog wandert auf den Vorwärts-Zweig.
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyLeft, Alt: true})
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Fatalf("alt+left → view=%d, want viewBrowseProject", m.view)
	}
	if len(m.navFwd) != 1 || m.navFwd[0] != viewBrowseBacklog {
		t.Fatalf("navFwd=%v, want [viewBrowseBacklog]", m.navFwd)
	}
	if len(m.navBack) != 0 {
		t.Fatalf("navBack=%v, want leer nach Rücksprung", m.navBack)
	}
	// alt+rechts → wieder vorwärts ins Backlog.
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyRight, Alt: true})
	m = mi.(model)
	if m.view != viewBrowseBacklog {
		t.Fatalf("alt+right → view=%d, want viewBrowseBacklog", m.view)
	}
}

// TestRouteHistoryAltJL prüft die jkli-Spiegel-Tasten alt+j (zurück) / alt+l (vor).
func TestRouteHistoryAltJL(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(keyMsg("b"))
	m = mi.(model)
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("j"), Alt: true})
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Fatalf("alt+j → view=%d, want viewBrowseProject", m.view)
	}
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("l"), Alt: true})
	m = mi.(model)
	if m.view != viewBrowseBacklog {
		t.Fatalf("alt+l → view=%d, want viewBrowseBacklog", m.view)
	}
}

// TestRouteHistoryEmptyNoop: alt+links/rechts ohne History ändert nichts.
func TestRouteHistoryEmptyNoop(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(tea.KeyMsg{Type: tea.KeyLeft, Alt: true})
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Errorf("alt+left ohne History → view=%d, want unverändert viewBrowseProject", m.view)
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
	if m.view != viewBrowseProject { // DD2-61: Picker führt in den Primat-View (Tree)
		t.Errorf("nach Auswahl view=%d, want viewBrowseProject", m.view)
	}
	if m.project == nil || m.project.ID != 9 {
		t.Errorf("Projekt nicht gesetzt: %+v", m.project)
	}
}
