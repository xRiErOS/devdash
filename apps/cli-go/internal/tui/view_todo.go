package tui

import (
	"fmt"
	"sort"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// view_todo.go — Projekt-ToDos-Browser (DD2-171): MasterDetail über project_todos
// (DD-280). Status-Filter (s, serverseitig), Label-Suche (/, clientseitig), Sort
// (o, pos|label). enter toggelt open<->done, e editiert die details in neovim,
// n legt an, d löscht. Einstieg via Command-Palette.

// filteredTodos wendet den clientseitigen Label-Filter + Sort auf todoAll an.
func (m *model) filteredTodos() []api.Todo {
	q := strings.ToLower(strings.TrimSpace(m.todoQuery))
	out := make([]api.Todo, 0, len(m.todoAll))
	for _, t := range m.todoAll {
		if q == "" || strings.Contains(strings.ToLower(t.Label), q) {
			out = append(out, t)
		}
	}
	if m.todoSort == "label" {
		sort.SliceStable(out, func(i, j int) bool {
			return strings.ToLower(out[i].Label) < strings.ToLower(out[j].Label)
		})
	}
	return out
}

func (m *model) selTodo() *api.Todo {
	list := m.filteredTodos()
	if m.todolist.cursor >= 0 && m.todolist.cursor < len(list) {
		return &list[m.todolist.cursor]
	}
	return nil
}

// nextTodoStatus schaltet den serverseitigen Status-Filter zyklisch weiter.
func nextTodoStatus(cur string) string {
	switch cur {
	case "":
		return "open"
	case "open":
		return "done"
	case "done":
		return "cancelled"
	default:
		return ""
	}
}

// openToDos öffnet den ToDo-Browser (lädt alle ToDos).
func (m model) openToDos() (tea.Model, tea.Cmd) {
	m.view = viewToDos
	m.todolist = listState{}
	m.todoAll = nil
	m.todoStatus = ""
	m.todoSearching = false
	m.todoQuery = ""
	m.todoSort = "pos"
	m.todoEditID = 0
	m.status = ""
	return m, loadTodos(m.client, "")
}

// keyToDos steuert den Browser. Voll-Intercept (/ tippt Suche).
func (m model) keyToDos(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.todoSearching {
		return m.keyToDosSearch(msg)
	}
	switch navKey(msg.String()) {
	case "up":
		m.todolist.move(-1)
		return m, nil
	case "down":
		m.todolist.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		m.status = ""
		return m, nil
	case "/":
		m.todoSearching = true
		m.todoQuery = ""
		m.status = ""
		return m, nil
	case "s": // status-Filter zyklisch (serverseitig neu laden)
		m.todoStatus = nextTodoStatus(m.todoStatus)
		m.todolist = listState{}
		return m, loadTodos(m.client, m.todoStatus)
	case "o": // Sort umschalten (clientseitig)
		if m.todoSort == "label" {
			m.todoSort = "pos"
		} else {
			m.todoSort = "label"
		}
		m.todolist = listState{}
		return m, nil
	case "enter": // toggle open<->done
		cur := m.selTodo()
		if cur == nil {
			return m, nil
		}
		return m, toggleTodoCmd(m.client, cur.ID, cur.Status != "done", m.todoStatus)
	case "e": // edit details in neovim
		cur := m.selTodo()
		if cur == nil {
			return m, nil
		}
		m.todoEditID = cur.ID
		return m, editInEditor(deref(cur.Details), ".md")
	case "n": // create: erste Buffer-Zeile = label
		m.todoEditID = 0
		return m, editInEditor("New todo\n\n", ".md")
	case "d":
		cur := m.selTodo()
		if cur == nil {
			return m, nil
		}
		return m.openDelete("todo", cur.ID, cur.Label)
	}
	return m, nil
}

// keyToDosSearch ist der Label-Suchmodus (clientseitig, live).
func (m model) keyToDosSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter, tea.KeyEsc:
		m.todoSearching = false
		if msg.Type == tea.KeyEsc {
			m.todoQuery = ""
		}
		m.todolist = listState{}
		return m, nil
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.todoQuery) > 0 {
			r := []rune(m.todoQuery)
			m.todoQuery = string(r[:len(r)-1])
			m.todolist = listState{}
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.todoQuery += string(msg.Runes)
		m.todolist = listState{}
		return m, nil
	}
	return m, nil
}

// --- View ---

func (m model) viewToDos() string {
	w := m.termWidth()
	h := m.bodyHeight()
	leftW, rightW := m.masterDetailWidths(w)

	listP := pane{title: m.todoListTitle(), rows: m.todoRows(), cursor: m.todolist.cursor, isList: true}
	detP := pane{title: "Detail", rows: m.todoDetailRows(rightW - 2), isList: false}
	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("ToDos"))
	footer := theme.Dim.Render("i/k:↑↓  enter:toggle  e:edit  n:new  d:del  /:search  s:status  o:sort  esc/q:back")
	if m.todoSearching {
		footer = theme.Key.Render("Search: ") + m.todoQuery + "▏"
	} else if m.status != "" {
		footer = m.status
	}
	return head + "\n" + body + "\n" + footer
}

func (m model) todoListTitle() string {
	st := "all"
	if m.todoStatus != "" {
		st = m.todoStatus
	}
	return fmt.Sprintf("ToDos ∙ %s (%d) ∙ %s", st, len(m.filteredTodos()), m.todoSort)
}

func (m model) todoRows() []string {
	list := m.filteredTodos()
	if len(list) == 0 {
		return []string{theme.Dim.Render("(none — n: new, / search, s status)")}
	}
	rows := make([]string, len(list))
	for i, t := range list {
		box := "[ ]"
		switch t.Status {
		case "done":
			box = theme.Accent.Render("[x]")
		case "cancelled":
			box = theme.Dim.Render("[-]")
		}
		rows[i] = fmt.Sprintf("%s %s", box, t.Label)
	}
	return rows
}

func (m model) todoDetailRows(width int) []string {
	cur := m.selTodo()
	if cur == nil {
		return []string{theme.Dim.Render("(select a todo →)")}
	}
	rows := []string{
		theme.Header.Render(cur.Label),
		theme.Dim.Render("status: " + cur.Status),
		"",
	}
	if d := deref(cur.Details); strings.TrimSpace(d) != "" {
		rows = append(rows, strings.Split(glowRender(d, width), "\n")...)
	} else {
		rows = append(rows, theme.Dim.Render("(no details — e to edit)"))
	}
	return rows
}
