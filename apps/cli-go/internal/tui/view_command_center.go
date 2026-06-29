package tui

// view_command_center.go — projektweite Issue-Such-Ansicht (DD2-91). Eigene Ansicht (DECISION:
// nicht die Tree-/Backlog-Suche erweitern): volltextet über ALLE Issues
// (treeFilterIssues, einmal projektweit geladen) — unabhängig vom aufgeklappten
// Tree. Master-Detail: links flache Trefferliste (Key/Title/Status), rechts Detail
// des selektierten Issues. Erreichbar über das Command-Center ("Go to: Search").

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// openSearch öffnet die Such-Ansicht und lädt projektweit alle Issues nach,
// falls noch nicht geschehen (sonst nur der Lazy-Tree-Cache).
func (m model) openSearch() (tea.Model, tea.Cmd) {
	if m.view == viewBrowseProject {
		m.topReturn = m.view
	}
	m.view = viewCommandCenter
	m.searchQuery = ""
	m.searchList = listState{}
	m.status = ""
	if !m.treeIssuesLoaded {
		return m, loadAllIssues(m.client)
	}
	m.searchList.setLen(len(m.searchResults()))
	return m, nil
}

// searchResults filtert die projektweit geladenen Issues nach der Suchanfrage
// (Key+Title, case-insensitive). Leere Query → alle.
func (m model) searchResults() []api.Issue {
	q := strings.ToLower(strings.TrimSpace(m.searchQuery))
	out := make([]api.Issue, 0, len(m.treeFilterIssues))
	for _, it := range m.treeFilterIssues {
		if q == "" || strings.Contains(strings.ToLower(it.Key+" "+it.Title), q) {
			out = append(out, it)
		}
	}
	return out
}

// keySearch steuert die Such-Ansicht: tippen filtert live, ↑↓/i/k navigiert,
// esc/q… esc kehrt zur Heimat-View (topReturn) zurück. Voll-Intercept (q tippt).
func (m model) keySearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.view = m.topReturn // DD2-91: zurück in die Heimat-View (Default viewBrowseProject)
		m.status = ""
		return m, nil
	case tea.KeyUp:
		m.searchList.move(-1)
		return m, nil
	case tea.KeyDown:
		m.searchList.move(1)
		return m, nil
	case tea.KeyBackspace, tea.KeyDelete:
		if len(m.searchQuery) > 0 {
			r := []rune(m.searchQuery)
			m.searchQuery = string(r[:len(r)-1])
			m.searchList = listState{}
			m.searchList.setLen(len(m.searchResults()))
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.searchQuery += string(msg.Runes)
		m.searchList = listState{}
		m.searchList.setLen(len(m.searchResults()))
		return m, nil
	}
	return m, nil
}

func (m model) viewCommandCenter() string {
	w := m.termWidth()
	h := m.bodyHeight()
	results := m.searchResults()
	if m.searchList.length != len(results) {
		m.searchList.setLen(len(results))
	}
	if m.searchList.cursor >= len(results) {
		m.searchList.cursor = len(results) - 1
	}
	if m.searchList.cursor < 0 {
		m.searchList.cursor = 0
	}
	leftW, rightW := m.masterDetailWidths(w)

	listP := pane{title: fmt.Sprintf("Results (%d)", len(results)), rows: m.searchRows(results), cursor: m.searchList.cursor, isList: true}
	detP := pane{title: "Detail", rows: m.searchDetailRows(results, rightW-2), isList: false}
	left := renderPane(listP, leftW, h, true)
	right := renderPane(detP, rightW, h, false)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, right)

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Search")) +
		"  " + theme.Key.Render("/ ") + m.searchQuery + "▏"
	footer := theme.Dim.Render("type: filter all issues   i/k or ↑↓: navigate   esc: back")
	if m.status != "" {
		footer = m.status
	}
	// DD2-91 Rework: in den App-Außenrahmen wrappen (Chrome-Parität zu Tree/Columns/Backlog).
	return m.outerBorder(head + "\n" + body + "\n" + footer)
}

func (m model) searchRows(results []api.Issue) []string {
	if len(results) == 0 {
		return []string{theme.Dim.Render("(no matches — type to search)")}
	}
	rows := make([]string, len(results))
	for i, it := range results {
		rows[i] = theme.TypeIcon(it.Type) + " " + theme.Key.Render(it.Key) + "  " +
			statusText(it.Status) + "  " + it.Title
	}
	return rows
}

func (m model) searchDetailRows(results []api.Issue, w int) []string {
	if len(results) == 0 || m.searchList.cursor < 0 || m.searchList.cursor >= len(results) {
		return []string{theme.Dim.Render("(no selection)")}
	}
	it := results[m.searchList.cursor]
	rows := []string{
		theme.Header.Render(it.Key + " — " + it.Title),
		theme.StatusStyle(it.Status).Render(it.Status) + "  " +
			theme.TypeIcon(it.Type) + " " + it.Type + "  " + theme.Priority(it.Priority),
		theme.Dim.Render("milestone: ") + deref(it.Milestone),
		"",
	}
	if g := deref(it.Goal); g != "" {
		rows = append(rows, theme.Dim.Render("Goal:"))
		rows = append(rows, strings.Split(wrapText(g, w), "\n")...)
		rows = append(rows, "")
	}
	if bg := deref(it.Background); bg != "" {
		rows = append(rows, theme.Dim.Render("Background:"))
		rows = append(rows, strings.Split(wrapText(bg, w), "\n")...)
	}
	return rows
}
