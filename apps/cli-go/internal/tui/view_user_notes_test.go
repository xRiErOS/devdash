package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func userNotesTestModel() model {
	m := model{view: viewUserNotes, width: 90, height: 22, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	m.topReturn = viewBrowseProject
	pr := "https://example.test/pr/1"
	m.unList = []api.UserNote{
		{ID: 7, Title: "Deploy checklist", Details: "# Deploy\n\n- step one", PrURL: &pr, Sprints: []string{"DD2#32"}, Issues: []string{"DD2-168"}},
		{ID: 5, Title: "Scratch", Details: ""},
	}
	m.unlist.setLen(len(m.unList))
	return m
}

func TestFirstLineTitle(t *testing.T) {
	cases := map[string]string{
		"# Hello\n\nbody": "Hello",
		"\n\n  Plain":     "Plain",
		"":                "Untitled",
		"   \n  ":         "Untitled",
	}
	for in, want := range cases {
		if got := firstLineTitle(in); got != want {
			t.Errorf("firstLineTitle(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestUserNotesNavDown(t *testing.T) {
	m := userNotesTestModel()
	nm, _ := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("k")})
	if nm.(model).unlist.cursor != 1 {
		t.Fatalf("k should move down, cursor=%d", nm.(model).unlist.cursor)
	}
}

func TestUserNotesEnterEdits(t *testing.T) {
	m := userNotesTestModel()
	m.unlist.cursor = 0
	nm, cmd := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyEnter})
	if nm.(model).unEditID != 7 || cmd == nil {
		t.Fatalf("enter should edit note 7: editID=%d cmd=%v", nm.(model).unEditID, cmd)
	}
}

func TestUserNotesCreate(t *testing.T) {
	m := userNotesTestModel()
	m.unEditID = 99 // stale → must reset to 0 for create
	nm, cmd := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("n")})
	if nm.(model).unEditID != 0 || cmd == nil {
		t.Fatalf("n should enter create mode: editID=%d cmd=%v", nm.(model).unEditID, cmd)
	}
}

func TestUserNotesDeleteConfirm(t *testing.T) {
	m := userNotesTestModel()
	m.unlist.cursor = 0
	nm, _ := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("d")})
	got := nm.(model)
	if !got.delConfirm || got.delKind != "usernote" || got.delID != 7 {
		t.Fatalf("d should open delete confirm for note 7: %+v", got.delKind)
	}
}

func TestUserNotesSearch(t *testing.T) {
	m := userNotesTestModel()
	nm, _ := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("/")})
	if !nm.(model).unSearching {
		t.Fatalf("/ should enter search mode")
	}
	nm2, cmd := nm.(model).keyUserNotes(tea.KeyMsg{Type: tea.KeyEnter})
	if nm2.(model).unSearching || cmd == nil {
		t.Fatalf("enter should leave search + reload")
	}
}

func TestUserNotesEsc(t *testing.T) {
	m := userNotesTestModel()
	nm, _ := m.keyUserNotes(tea.KeyMsg{Type: tea.KeyEsc})
	if nm.(model).view != viewBrowseProject {
		t.Fatalf("esc should return home, view=%v", nm.(model).view)
	}
}

func TestUserNotesSaveDispatch(t *testing.T) {
	m := userNotesTestModel()
	m.view = viewUserNotes
	m.unEditID = 7
	if _, cmd := m.Update(editorFinishedMsg{content: "new", changed: true}); cmd == nil {
		t.Fatalf("changed edit should dispatch save")
	}
}

// DD2-168 Rework: Detail-Header zeigt created/updated/status, sobald gesetzt.
func TestUserNotesMetaHeader(t *testing.T) {
	m := userNotesTestModel()
	created, updated := "2026-06-29 08:00", "2026-06-30 09:00"
	m.unList[0].CreatedAt = &created
	m.unList[0].UpdatedAt = &updated
	m.unList[0].Status = "archived"
	m.unlist.cursor = 0
	joined := strings.Join(m.unDetailRows(60), "\n")
	for _, want := range []string{"created:", "updated:", "status: archived"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("note detail meta missing %q:\n%s", want, joined)
		}
	}
}

func TestGoldenUserNotes(t *testing.T) {
	assertGolden(t, "user_notes", userNotesTestModel().View())
}
