package tui

// box_confirm_delete.go — Cascade-Delete mit Confirm (T02b). d auf einem Meilenstein/Sprint
// holt erst die Preview-Counts (was mitgelöscht wird) und zeigt einen
// Bestätigungs-Dialog; y/enter löst den transaktionalen Cascade-Delete (T02a)
// aus, esc/n bricht ab.

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// openDelete startet den Lösch-Dialog für eine Entität. Meilenstein/Sprint laden die
// Cascade-Counts nach; ein Issue (DD2-65) hat keine Kinder → kein Preview-Load.
func (m model) openDelete(kind string, id int, name string) (tea.Model, tea.Cmd) {
	m.delConfirm = true
	m.delKind = kind
	m.delID = id
	m.delName = name
	m.delSprints, m.delIssues, m.delDocs = 0, 0, 0
	m.status = ""
	if kind == "issue" {
		m.delLoading = false // kein Cascade-Preview nötig
		return m, nil
	}
	m.delLoading = true
	return m, loadDeletePreview(m.client, kind, id)
}

// removeIssueFromCaches entfernt ein gelöschtes Issue per ID aus allen In-Memory-
// Caches (Backlog + Tree-Lazy-Cache + Filter-Quelle) — in-place, kein Refetch (DD2-65).
func (m *model) removeIssueFromCaches(id int) {
	for sid := range m.treeIssues {
		m.treeIssues[sid] = removeIssueByID(m.treeIssues[sid], id)
	}
	m.treeFilterIssues = removeIssueByID(m.treeFilterIssues, id)
	m.backlog = removeIssueByID(m.backlog, id)
}

// removeIssueByID liefert items ohne das Issue mit der gegebenen ID.
func removeIssueByID(items []api.Issue, id int) []api.Issue {
	out := items[:0]
	for _, it := range items {
		if it.ID != id {
			out = append(out, it)
		}
	}
	return out
}

// keyDelete steuert den Confirm-Dialog (DD2-174: enter=confirm, esc/n=cancel).
func (m model) keyDelete(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch {
	case keybind.Matches(msg, keys.Back), msg.String() == "n":
		m.delConfirm = false
		m.status = ""
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		if m.delLoading {
			return m, nil // erst Counts abwarten
		}
		m.delConfirm = false
		m.status = "Deleting " + m.delName + " …"
		if m.delKind == "issue" { // DD2-65: einzelnes Issue, kein Cascade
			return m, doDeleteIssue(m.client, m.delID, m.delName)
		}
		return m, doCascadeDelete(m.client, m.delKind, m.delID, m.delName)
	}
	return m, nil
}

// deleteBox rendert den Confirm-Dialog (rot = destruktiv).
func (m model) deleteBox() string {
	var b strings.Builder
	head := "Delete milestone"
	switch m.delKind {
	case "sprint":
		head = "Delete sprint"
	case "issue":
		head = "Delete issue"
	}
	b.WriteString(lipgloss.NewStyle().Foreground(theme.Red).Bold(true).Render(head) + "\n")
	b.WriteString(theme.Header.Render(truncate(m.delName, 40)) + "\n\n")
	if m.delKind == "issue" { // DD2-65: kein Cascade — schlichtes Confirm
		b.WriteString(theme.Dim.Render("The issue will be permanently deleted.") + "\n")
		b.WriteString("\n" + lipgloss.NewStyle().Foreground(theme.Red).Render("Irreversible.") + "\n")
	} else if m.delLoading {
		b.WriteString(theme.Dim.Render("(loading scope …)") + "\n")
	} else {
		b.WriteString("Also deleted:\n")
		if m.delKind == "milestone" {
			b.WriteString(fmt.Sprintf("  %d Sprint(s)\n", m.delSprints))
		}
		b.WriteString(fmt.Sprintf("  %d Issue(s)\n", m.delIssues))
		b.WriteString(fmt.Sprintf("  %d Dokument(e)\n", m.delDocs))
		b.WriteString("\n" + lipgloss.NewStyle().Foreground(theme.Red).Render("Irreversible.") + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("enter: delete permanently   esc/n: cancel"))
	return modalBox(b.String(), clampModalWidth(48, m.width), theme.Red)
}
