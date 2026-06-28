package tui

// backlog_assign.go — Issue→Sprint-Zuweisung aus dem Backlog (DD2-136, Review-
// Befund #4). S öffnet einen Single-Select-Picker über die NICHT-finalen Sprints
// (planning/active); enter weist zu (PATCH /api/backlog/:id/sprint). Danach verlässt
// das Issue das Backlog (= neu/geplant ohne Sprint) → in-place aus dem Cache. Muster
// gespiegelt von assign.go (Flow A, Sprint→Meilenstein).

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
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

// assignSprintMenu rendert den Picker als großzügige Block-Liste (DD2-140): je Sprint
// ein mehrzeiliger Block — Key führt, Titel umbricht (Key-eingerückt), Issue-Count
// rechtsbündig, darunter die Meilenstein-Zeile. Cursor markiert den ganzen Block.
func (m model) assignSprintMenu() string {
	mw := clampModalWidth(72, m.width)
	cw := mw - 5 // Innenbreite minus Border/Padding (1 Spalte bleibt für den Cursor)
	if cw < 24 {
		cw = 24
	}
	body := theme.Dim.Render("i/k: wählen   enter: zuweisen   esc: abbrechen") + "\n\n"
	if len(m.asSprints) == 0 {
		body += theme.Dim.Render("(keine offenen Sprints — oder lädt …)")
		return modalPanel("Issue einem Sprint zuweisen", body, "", mw, theme.Mauve)
	}
	blocks := make([]string, len(m.asSprints))
	for i, s := range m.asSprints {
		blocks[i] = m.assignSprintBlock(s, cw, i == m.asMenu.cursor)
	}
	body += strings.Join(blocks, "\n")
	return modalPanel("Issue einem Sprint zuweisen", body, "", mw, theme.Mauve)
}

// assignSprintBlock rendert einen Sprint als Block: Zeile 1 'Key - Titel … N Issues'
// (Count rechtsbündig), Titel-Fortsetzung Key-eingerückt, dann 'Meilenstein: ID - Name'.
func (m model) assignSprintBlock(s api.Sprint, w int, sel bool) string {
	prefix := s.Key + " - "
	indent := strings.Repeat(" ", lipgloss.Width(prefix))
	count := fmt.Sprintf("%d Issues", s.ItemCount)

	// Count steht rechtsbündig auf Zeile 1 → seine Breite (+1 Gap) muss beim
	// Titel-Wrap reserviert sein, sonst füllt eine lange erste Titelzeile die
	// volle Breite und der Count overflowt in die nächste Terminal-Zeile (PO-Bug:
	// '4' am Zeilenende, 'Issues' auf Spalte 0). Reservierung gilt für ALLE Zeilen
	// (konsistente Breite); Folgezeilen tragen keinen Count, bleiben so < w.
	titleW := w - lipgloss.Width(prefix) - lipgloss.Width(count) - 1
	if titleW < 8 {
		titleW = 8
	}
	tlines := strings.Split(wrapText(s.Name, titleW), "\n")

	var lines []string
	// Zeile 1: Key (Header) + " - " + Titel-Anfang, Count rechtsbündig.
	leftW := lipgloss.Width(prefix + tlines[0])
	gap := w - leftW - lipgloss.Width(count)
	if gap < 1 {
		gap = 1
	}
	lines = append(lines, theme.Header.Render(s.Key)+theme.Dim.Render(" - ")+tlines[0]+
		strings.Repeat(" ", gap)+theme.Accent.Render(count))
	for _, tl := range tlines[1:] {
		lines = append(lines, indent+tl)
	}
	// Meilenstein-Zeile (ID führt), Key-eingerückt, umbrechend.
	ms := "(kein Meilenstein)"
	if s.MilestoneName != nil && *s.MilestoneName != "" {
		mid := ""
		if s.MilestoneID != nil {
			mid = fmt.Sprintf("%d - ", *s.MilestoneID)
		}
		ms = "Meilenstein: " + mid + *s.MilestoneName
	}
	for _, ml := range strings.Split(wrapText(ms, w-lipgloss.Width(indent)), "\n") {
		lines = append(lines, indent+theme.Dim.Render(ml))
	}

	// Cursor-Markierung: Balken auf jeder Block-Zeile (selektiert) bzw. 1 Leerspalte.
	for j := range lines {
		if sel {
			lines[j] = theme.Accent.Render("▌") + lines[j]
		} else {
			lines[j] = " " + lines[j]
		}
	}
	return strings.Join(lines, "\n")
}
