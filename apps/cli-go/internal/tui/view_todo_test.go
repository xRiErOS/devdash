package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func todoTestModel() model {
	m := model{view: viewToDos, width: 90, height: 22, project: &api.Project{Slug: "devd2", Prefix: "DD2"}}
	m.topReturn = viewBrowseProject
	m.todoSort = "pos"
	det := "Some **detail** text."
	m.todoAll = []api.Todo{
		{ID: 1, Label: "Zebra task", Status: "open", Position: 1, Details: &det},
		{ID: 2, Label: "Alpha task", Status: "done", Position: 2},
		{ID: 3, Label: "Mid task", Status: "cancelled", Position: 3},
	}
	m.todolist.setLen(len(m.filteredTodos()))
	return m
}

func TestTodoFilterLabel(t *testing.T) {
	m := todoTestModel()
	m.todoQuery = "alpha"
	got := m.filteredTodos()
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("label filter wrong: %+v", got)
	}
}

func TestTodoSortLabel(t *testing.T) {
	m := todoTestModel()
	m.todoSort = "label"
	got := m.filteredTodos()
	if got[0].Label != "Alpha task" || got[2].Label != "Zebra task" {
		t.Fatalf("label sort wrong: %v %v", got[0].Label, got[2].Label)
	}
}

func TestTodoStatusCycle(t *testing.T) {
	if nextTodoStatus("") != "open" || nextTodoStatus("open") != "done" ||
		nextTodoStatus("done") != "cancelled" || nextTodoStatus("cancelled") != "" {
		t.Fatalf("status cycle wrong")
	}
	m := todoTestModel()
	nm, cmd := m.keyToDos(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("s")})
	if nm.(model).todoStatus != "open" || cmd == nil {
		t.Fatalf("s should cycle status + reload")
	}
}

func TestTodoSortToggle(t *testing.T) {
	m := todoTestModel()
	nm, _ := m.keyToDos(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("o")})
	if nm.(model).todoSort != "label" {
		t.Fatalf("o should toggle sort to label")
	}
}

func TestTodoEnterToggle(t *testing.T) {
	m := todoTestModel()
	m.todolist.cursor = 0 // Zebra (open) → toggle to done
	_, cmd := m.keyToDos(tea.KeyMsg{Type: tea.KeyEnter})
	if cmd == nil {
		t.Fatalf("enter should dispatch toggle")
	}
}

func TestTodoEditAndCreate(t *testing.T) {
	m := todoTestModel()
	m.todolist.cursor = 0
	nm, cmd := m.keyToDos(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("e")})
	if nm.(model).todoEditID != 1 || cmd == nil {
		t.Fatalf("e should edit todo 1")
	}
	m2 := todoTestModel()
	m2.todoEditID = 99
	nm2, cmd2 := m2.keyToDos(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("n")})
	if nm2.(model).todoEditID != 0 || cmd2 == nil {
		t.Fatalf("n should enter create mode")
	}
}

func TestTodoDeleteConfirm(t *testing.T) {
	m := todoTestModel()
	m.todolist.cursor = 0
	nm, _ := m.keyToDos(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("d")})
	got := nm.(model)
	if !got.delConfirm || got.delKind != "todo" || got.delID != 1 {
		t.Fatalf("d should open todo delete confirm: %+v", got.delKind)
	}
}

func TestTodoEsc(t *testing.T) {
	m := todoTestModel()
	nm, _ := m.keyToDos(tea.KeyMsg{Type: tea.KeyEsc})
	if nm.(model).view != viewBrowseProject {
		t.Fatalf("esc should return home")
	}
}

func TestTodoSaveDispatch(t *testing.T) {
	m := todoTestModel()
	m.view = viewToDos
	m.todoEditID = 1
	if _, cmd := m.Update(editorFinishedMsg{content: "changed", changed: true}); cmd == nil {
		t.Fatalf("changed edit should dispatch save")
	}
}

func TestGoldenToDos(t *testing.T) {
	assertGolden(t, "todos", todoTestModel().View())
}
