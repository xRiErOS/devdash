package tui

// backlog_assign.go — Issue→Sprint-Zuweisung aus dem Backlog (DD2-136, Review-
// Befund #4). S öffnet einen Single-Select-Picker über die NICHT-finalen Sprints
// (planning/active); enter weist zu (PATCH /api/backlog/:id/sprint). Danach verlässt
// das Issue das Backlog (= neu/geplant ohne Sprint) → in-place aus dem Cache. Muster
// gespiegelt von assign.go (Flow A, Sprint→Meilenstein).

import (
	"fmt"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

// assignableSprintsMsg / issueAssignedMsg tragen Lade- bzw. Zuweisungs-Ergebnis.
type assignSprintsMsg struct{ items []api.Sprint }
type issueAssignedMsg struct {
	issueID   int
	sprintKey string
	err       string
}

// assignableSprints filtert auf nicht-finale Sprints — nur planning/active sind
// gültige Zuweisungsziele (completed/cancelled/review sind final/gesperrt).
func assignableSprints(all []api.Sprint) []api.Sprint {
	var out []api.Sprint
	for _, s := range all {
		if s.Status == "planning" || s.Status == "active" {
			out = append(out, s)
		}
	}
	return out
}

// loadAssignableSprints holt alle Sprints und filtert auf die zuweisbaren.
func loadAssignableSprints(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		all, err := c.ListSprints("")
		if err != nil {
			return noticeMsg{cleanAPIErr(err)}
		}
		return assignSprintsMsg{assignableSprints(all)}
	}
}

// doAssignIssueSprint weist das Issue dem Sprint zu (PATCH /api/backlog/:id/sprint).
func doAssignIssueSprint(c *api.Client, issueID, sprintID int, sprintKey string) tea.Cmd {
	return func() tea.Msg {
		if _, err := c.AssignSprint(issueID, &sprintID); err != nil {
			return issueAssignedMsg{issueID: issueID, err: cleanAPIErr(err)}
		}
		return issueAssignedMsg{issueID: issueID, sprintKey: sprintKey}
	}
}

// openAssignSprint öffnet den Sprint-Picker für ein Issue und lädt die Ziele.
func (m model) openAssignSprint(issueID int) (tea.Model, tea.Cmd) {
	m.asPick = true
	m.asIssueID = issueID
	m.asSprints = nil
	m.asMenu = listState{}
	m.status = ""
	return m, loadAssignableSprints(m.client)
}

// keyAssignSprint steuert den Picker: i/k navigiert, enter weist zu, esc/S schließt.
// Global dispatcht (handleKey, vor der View-Weiche) — funktioniert in Backlog UND Tree.
func (m model) keyAssignSprint(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.asMenu.move(-1)
		return m, nil
	case "down":
		m.asMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "S":
		m.asPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.asPick = false
		if m.asMenu.cursor < 0 || m.asMenu.cursor >= len(m.asSprints) {
			return m, nil
		}
		sp := m.asSprints[m.asMenu.cursor]
		m.status = "Issue → " + sp.Key + " …"
		return m, doAssignIssueSprint(m.client, m.asIssueID, sp.ID, sp.Key)
	}
	return m, nil
}

// assignSprintMenu rendert den Picker (nur nicht-finale Sprints).
func (m model) assignSprintMenu() string {
	body := theme.Dim.Render("enter: zuweisen   esc: abbrechen") + "\n\n"
	if len(m.asSprints) == 0 {
		body += theme.Dim.Render("(keine offenen Sprints — oder lädt …)") + "\n"
	}
	body += menuList(len(m.asSprints), m.asMenu.cursor, func(i int, sel bool) string {
		s := m.asSprints[i]
		head := fmt.Sprintf("%-9s %s", s.Key, truncate(s.Name, 28))
		if sel {
			head = theme.Header.Render(head)
		}
		return head + theme.Dim.Render(" ("+s.Status+")")
	})
	return modalPanel("Issue einem Sprint zuweisen", body, "", clampModalWidth(52, m.width), theme.Mauve)
}
