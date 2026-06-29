package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// view_user_notes.go — User-Notes-Browser (DD2-168): MasterDetail über user_notes
// (DD2-161) mit FTS-Suche (/), neovim-Edit der details (enter), Create (n) und
// Delete (d, Confirm). Einstieg via Command-Palette. details werden vom Backend
// bereits in der Liste mitgeliefert → kein separater Detail-Fetch.

func (m *model) selUserNote() *api.UserNote {
	if m.unlist.cursor >= 0 && m.unlist.cursor < len(m.unList) {
		return &m.unList[m.unlist.cursor]
	}
	return nil
}

// openUserNotes öffnet den User-Notes-Browser (lädt die Liste).
func (m model) openUserNotes() (tea.Model, tea.Cmd) {
	m.view = viewUserNotes
	m.unlist = listState{}
	m.unList = nil
	m.unSearching = false
	m.unQuery = ""
	m.unEditID = 0
	m.status = ""
	return m, loadUserNotes(m.client, "")
}

// keyUserNotes steuert den Browser. Voll-Intercept, damit / die Suche tippen kann.
func (m model) keyUserNotes(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.unSearching {
		return m.keyUserNotesSearch(msg)
	}
	switch navKey(msg.String()) {
	case "up":
		m.unlist.move(-1)
		return m, nil
	case "down":
		m.unlist.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		m.status = ""
		return m, nil
	case "/":
		m.unSearching = true
		m.unQuery = ""
		m.status = ""
		return m, nil
	case "n": // create: ganze Datei in neovim, erste Zeile = Titel
		m.unEditID = 0
		return m, editInEditor("# Title\n\n", ".md")
	case "enter": // edit details der selektierten Notiz
		cur := m.selUserNote()
		if cur == nil {
			return m, nil
		}
		m.unEditID = cur.ID
		return m, editInEditor(cur.Details, ".md")
	case "d":
		cur := m.selUserNote()
		if cur == nil {
			return m, nil
		}
		return m.openDelete("usernote", cur.ID, cur.Title)
	}
	return m, nil
}

// keyUserNotesSearch ist der FTS-Eingabemodus (/).
func (m model) keyUserNotesSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		m.unSearching = false
		m.unlist = listState{}
		return m, loadUserNotes(m.client, strings.TrimSpace(m.unQuery))
	case tea.KeyEsc:
		m.unSearching = false
		m.unQuery = ""
		m.unlist = listState{}
		return m, loadUserNotes(m.client, "")
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.unQuery) > 0 {
			r := []rune(m.unQuery)
			m.unQuery = string(r[:len(r)-1])
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.unQuery += string(msg.Runes)
		return m, nil
	}
	return m, nil
}

// firstLineTitle extrahiert einen Titel aus dem neovim-Buffer: erste nicht-leere
// Zeile, führendes "# " entfernt. Fallback "Untitled".
func firstLineTitle(content string) string {
	for _, ln := range strings.Split(content, "\n") {
		t := strings.TrimSpace(ln)
		if t == "" {
			continue
		}
		t = strings.TrimPrefix(t, "# ")
		t = strings.TrimSpace(t)
		if t != "" {
			return t
		}
	}
	return "Untitled"
}

// --- View ---

func (m model) viewUserNotes() string {
	w := m.termWidth()
	h := m.bodyHeight()
	leftW, rightW := m.masterDetailWidths(w)

	listP := pane{title: m.unListTitle(), rows: m.unRows(), cursor: m.unlist.cursor, isList: true}
	detP := pane{title: "Detail", rows: m.unDetailRows(rightW - 2), isList: false}
	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("User-Notes"))
	footer := theme.Dim.Render("i/k:↑↓  /:search  enter:edit  n:new  d:delete  esc/q:back")
	if m.unSearching {
		footer = theme.Key.Render("Search: ") + m.unQuery + "▏"
	} else if m.status != "" {
		footer = m.status
	}
	return head + "\n" + body + "\n" + footer
}

func (m model) unListTitle() string {
	return fmt.Sprintf("Notes (%d)", len(m.unList))
}

func (m model) unRows() []string {
	if len(m.unList) == 0 {
		return []string{theme.Dim.Render("(none — n: new, / search)")}
	}
	rows := make([]string, len(m.unList))
	for i, n := range m.unList {
		rows[i] = n.Title
	}
	return rows
}

func (m model) unDetailRows(width int) []string {
	cur := m.selUserNote()
	if cur == nil {
		return []string{theme.Dim.Render("(select a note →)")}
	}
	rows := []string{
		theme.Header.Render(cur.Title),
		"",
	}
	if strings.TrimSpace(cur.Details) == "" {
		rows = append(rows, theme.Dim.Render("(no details — enter to edit)"))
	} else {
		rows = append(rows, strings.Split(glowRender(cur.Details, width), "\n")...)
	}
	meta := []string{}
	if pr := deref(cur.PrURL); pr != "" {
		meta = append(meta, "PR: "+pr)
	}
	if len(cur.Sprints) > 0 {
		meta = append(meta, "Sprints: "+strings.Join(cur.Sprints, ", "))
	}
	if len(cur.Issues) > 0 {
		meta = append(meta, "Issues: "+strings.Join(cur.Issues, ", "))
	}
	if len(meta) > 0 {
		rows = append(rows, "")
		for _, mline := range meta {
			rows = append(rows, theme.Dim.Render(mline))
		}
	}
	return rows
}
