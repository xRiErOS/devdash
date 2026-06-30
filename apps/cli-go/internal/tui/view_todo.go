package tui

import (
	"fmt"
	"sort"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
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
	case "enter", " ": // toggle open<->done (DD2-171 Rework: space = quick-complete)
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

	// DD2-171 Rework: Master-Liste mit umbrechenden Labels (eigener Renderer statt
	// renderPane, da ein ToDo mehrere visuelle Zeilen belegt).
	left := m.todoLeftPane(leftW, h)
	detP := pane{title: "Detail", rows: m.todoDetailRows(rightW - 2), isList: false}
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("ToDos"))
	footer := theme.Dim.Render("i/k:↑↓  enter/space:toggle  e:edit  n:new  d:del  /:search  s:status  o:sort  esc/q:back")
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

// todoCheckbox liefert die Status-Checkbox (Single Source für Liste + Wrap-Pane).
func todoCheckbox(status string) string {
	switch status {
	case "done":
		return theme.Accent.Render("[x]")
	case "cancelled":
		return theme.Dim.Render("[-]")
	}
	return "[ ]"
}

// todoLeftPane rendert die Master-Liste mit umbrechenden Labels (DD2-171 Rework):
// lange ToDo-Titel werden über mehrere Zeilen gebrochen statt abgeschnitten. Eigener
// Renderer (nicht renderPane), weil ein ToDo dadurch mehrere visuelle Zeilen belegt —
// der Cursor markiert ALLE Zeilen seines Items (▸ auf der ersten, Accent auf allen).
// Wrap-Breite explizit (Golden Rule #2: kein Auto-Wrap in der bordered Pane).
func (m model) todoLeftPane(w, h int) string {
	title := m.todoListTitle()
	lines := []string{
		theme.Header.Render(truncate(title, w)),
		theme.Dim.Render(strings.Repeat("─", min(w, lipgloss.Width(title)+2))),
	}
	list := m.filteredTodos()
	if len(list) == 0 {
		lines = append(lines, theme.Dim.Render("(none — n: new, / search, s status)"))
	}
	for i, t := range list {
		prefix := todoCheckbox(t.Status) + " "
		indent := strings.Repeat(" ", lipgloss.Width(prefix))
		wrapW := w - 2 - lipgloss.Width(prefix) // -2 = Cursor/Indent-Spalte
		if wrapW < 8 {
			wrapW = 8
		}
		segs := strings.Split(wrapText(t.Label, wrapW), "\n")
		sel := i == m.todolist.cursor
		for j, seg := range segs {
			text := prefix + seg
			if j > 0 {
				text = indent + seg
			}
			cursor := "  "
			if sel {
				if j == 0 {
					cursor = theme.Accent.Render("▸ ")
				}
				text = theme.Accent.Render(ansi.Strip(text)) // ganze Item-Zeile tönen
			}
			lines = append(lines, cursor+text)
		}
	}
	return borderedPane(lines, w, h, theme.Mauve)
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
		theme.Dim.Render("Details"), // DD2-171 Rework: explizite Überschrift für den Detail-Block
	}
	if d := deref(cur.Details); strings.TrimSpace(d) != "" {
		rows = append(rows, strings.Split(glowRender(d, width), "\n")...)
	} else {
		rows = append(rows, theme.Dim.Render("(no details — e to edit)"))
	}
	return rows
}
