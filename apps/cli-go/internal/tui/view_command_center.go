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
	"github.com/charmbracelet/x/ansi"
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

// viewCommandCenter rendert die Such-Ansicht als Master-Detail — IDENTISCH zum
// Project-Browser (DD2-198): zwei gerahmte Panes (paneBorderColors), links die
// Trefferliste, rechts das Issue-Detail über dieselben Primitive (detailTitle +
// metaStrip + ziffern-Accordion). Kein eigener Pane-Titel/Flat-Layout mehr.
func (m model) viewCommandCenter() string {
	w := m.termWidth()
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

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Search")) +
		"  " + theme.Key.Render("/ ") + m.searchQuery + "▏"
	footer := theme.Dim.Render("type: filter all issues   i/k or ↑↓: navigate   esc: back")
	// DD2-272: transiente Meldungen laufen über den Eck-Toast, nicht mehr über
	// diese Footer-Zeile.
	// Innenhöhe analog treeLayout: App-Rahmen + Kopf + Footer reserviert, -2 Pane-Border.
	innerH := m.frameH() - lipgloss.Height(head) - lipgloss.Height(footer) - 2
	if innerH < 4 {
		innerH = m.bodyHeight()
	}

	// Linke Pane: "Results (n)"-Kopf + gefensterte Trefferliste (Cursor-Balken D08).
	leftHead := theme.Header.Render(truncate(fmt.Sprintf("Results (%d)", len(results)), leftW-2))
	resultLines := windowAround(m.searchResultLines(results, leftW-2), innerH-1, m.searchList.cursor)
	left := append([]string{leftHead}, resultLines...)
	if len(left) > innerH {
		left = left[:innerH]
	}
	for len(left) < innerH {
		left = append(left, "")
	}

	// Rechte Pane: Issue-Detail wie im Project-Browser (detailTitle + metaStrip + Accordion).
	detail := m.searchDetailRows(results, rightW-2)
	for i := range detail {
		detail[i] = truncate(detail[i], rightW-2)
	}
	if len(detail) > innerH {
		detail = detail[:innerH]
	}
	for len(detail) < innerH {
		detail = append(detail, "")
	}

	// D03-Sprache: Master-Pane (links) ist der aktive Fokus in der Suche.
	leftCol, rightCol := paneBorderColors(false)
	leftBox := lipgloss.NewStyle().Width(leftW).
		Border(lipgloss.RoundedBorder()).BorderForeground(leftCol).
		Render(strings.Join(left, "\n"))
	rightBox := lipgloss.NewStyle().Width(rightW).
		Border(lipgloss.RoundedBorder()).BorderForeground(rightCol).
		Render(strings.Join(detail, "\n"))
	body := lipgloss.JoinHorizontal(lipgloss.Top, leftBox, rightBox)
	// DD2-91 Rework: in den App-Außenrahmen wrappen (Chrome-Parität zu Tree/Backlog).
	return m.outerBorder(head + "\n" + body + "\n" + footer)
}

// searchResultLines rendert die flache Trefferliste (icon+key+status+title); die
// Cursor-Zeile trägt den D08-Balken ▌ (akzentgetönt, Eigen-Farben gestrippt) — wie
// die linke Tree-/Backlog-Spalte. w-1 reserviert die Cursor-Spalte.
func (m model) searchResultLines(results []api.Issue, w int) []string {
	if len(results) == 0 {
		return []string{theme.Dim.Render("(no matches — type to search)")}
	}
	lines := make([]string, len(results))
	for i, it := range results {
		row := theme.TypeIcon(it.Type) + " " + theme.Key.Render(it.Key) + "  " +
			statusText(it.Status) + "  " + it.Title
		if i == m.searchList.cursor {
			lines[i] = theme.Accent.Render("▌" + truncate(ansi.Strip(row), w-1))
		} else {
			lines[i] = " " + truncate(row, w-1)
		}
	}
	return lines
}

// searchDetailRows rendert das Detail des selektierten Treffers IDENTISCH zum
// Project-Browser-Issue-Detail (DD2-198, treeDetail): detailTitle + metaStrip
// (milestone/prio/type/tags + Status) + ziffern-Accordion (issueSections). Read-
// only (kein Detail-Fokus). Single Source des Layouts bleibt damit das Browser-Detail.
func (m model) searchDetailRows(results []api.Issue, w int) []string {
	if len(results) == 0 || m.searchList.cursor < 0 || m.searchList.cursor >= len(results) {
		return []string{theme.Dim.Render("(no selection)")}
	}
	it := results[m.searchList.cursor]
	var b strings.Builder
	b.WriteString(detailTitle(it.Key, it.Title, w) + "\n")
	var tags string
	if len(it.Tags) > 0 {
		names := make([]string, len(it.Tags))
		for i, t := range it.Tags {
			names[i] = t.Name
		}
		tags = strings.Join(names, ",")
	}
	b.WriteString(metaStrip([]metaPair{
		{deref(it.Milestone), "milestone"},
		{theme.Priority(it.Priority), "prio"},
		{theme.TypeIcon(it.Type) + " " + theme.TypeStyle(it.Type).Render(it.Type), "type"},
		{tags, "tags"},
	}, statusText(it.Status), w))
	b.WriteString("\n\n")
	b.WriteString(theme.Muted.Render("Sections: digit [1..n] opens") + "\n")
	b.WriteString(renderAccordion(m.issueSections(it, w-2, true), m.accOpen, w, detailFocusView{}))
	return strings.Split(b.String(), "\n")
}
