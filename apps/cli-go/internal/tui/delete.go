package tui

// delete.go — Cascade-Delete mit Confirm (T02b). d auf einem Meilenstein/Sprint
// holt erst die Preview-Counts (was mitgelöscht wird) und zeigt einen
// Bestätigungs-Dialog; y/enter löst den transaktionalen Cascade-Delete (T02a)
// aus, esc/n bricht ab.

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// openDelete startet den Lösch-Dialog für eine Entität und lädt die Counts.
func (m model) openDelete(kind string, id int, name string) (tea.Model, tea.Cmd) {
	m.delConfirm = true
	m.delKind = kind
	m.delID = id
	m.delName = name
	m.delLoading = true
	m.delSprints, m.delIssues, m.delDocs = 0, 0, 0
	m.status = ""
	return m, loadDeletePreview(m.client, kind, id)
}

// keyDelete steuert den Confirm-Dialog.
func (m model) keyDelete(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "q", "n":
		m.delConfirm = false
		m.status = ""
		return m, nil
	case "y", "enter":
		if m.delLoading {
			return m, nil // erst Counts abwarten
		}
		m.delConfirm = false
		m.status = "Lösche " + m.delName + " …"
		return m, doCascadeDelete(m.client, m.delKind, m.delID, m.delName)
	}
	return m, nil
}

// deleteBox rendert den Confirm-Dialog (rot = destruktiv).
func (m model) deleteBox() string {
	var b strings.Builder
	head := "Meilenstein löschen"
	if m.delKind == "sprint" {
		head = "Sprint löschen"
	}
	b.WriteString(lipgloss.NewStyle().Foreground(theme.Red).Bold(true).Render(head) + "\n")
	b.WriteString(theme.Header.Render(truncate(m.delName, 40)) + "\n\n")
	if m.delLoading {
		b.WriteString(theme.Dim.Render("(lädt Umfang …)") + "\n")
	} else {
		b.WriteString("Mitgelöscht wird:\n")
		if m.delKind == "milestone" {
			b.WriteString(fmt.Sprintf("  %d Sprint(s)\n", m.delSprints))
		}
		b.WriteString(fmt.Sprintf("  %d Issue(s)\n", m.delIssues))
		b.WriteString(fmt.Sprintf("  %d Dokument(e)\n", m.delDocs))
		b.WriteString("\n" + lipgloss.NewStyle().Foreground(theme.Red).Render("Unwiderruflich.") + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("y: endgültig löschen   esc/n: abbrechen"))
	return modalBox(b.String(), clampModalWidth(48, m.width), theme.Red)
}
