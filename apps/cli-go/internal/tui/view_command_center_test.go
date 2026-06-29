package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-91: openSearch öffnet die Ansicht, searchResults filtert projektweit,
// Tippen filtert live, esc kehrt zur Heimat-View zurück.
func TestSearchFiltersAndExits(t *testing.T) {
	m := columnsModel()
	m.treeFilterIssues = []api.Issue{
		{Key: "DD2-1", Title: "Login bug", Type: "bug", Status: "new"},
		{Key: "DD2-2", Title: "Search view", Type: "feature", Status: "planned"},
	}
	m.treeIssuesLoaded = true
	m.view = viewBrowseProject // openSearch merkt sich die Heimat-View als topReturn

	mi, _ := m.openSearch()
	m = mi.(model)
	if m.view != viewCommandCenter {
		t.Fatalf("openSearch → view=%d, want viewCommandCenter", m.view)
	}
	if len(m.searchResults()) != 2 {
		t.Fatalf("leere Query → alle (2), got %d", len(m.searchResults()))
	}

	mi, _ = m.Update(keyMsg("login"))
	m = mi.(model)
	if m.searchQuery != "login" {
		t.Errorf("searchQuery=%q, want login", m.searchQuery)
	}
	res := m.searchResults()
	if len(res) != 1 || res[0].Key != "DD2-1" {
		t.Errorf("Filter 'login' → [DD2-1], got %+v", res)
	}

	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if mi.(model).view != viewBrowseProject {
		t.Errorf("esc → view=%d, want viewBrowseProject (topReturn)", mi.(model).view)
	}
}

func TestPaletteDispatchSearch(t *testing.T) {
	m := paletteModel()
	mi, _ := m.dispatchPalette("go_search")
	if mi.(model).view != viewCommandCenter {
		t.Errorf("go_search → view=%d, want viewCommandCenter", mi.(model).view)
	}
}
