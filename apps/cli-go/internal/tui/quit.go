package tui

// quit.go — Beenden-Bestätigung (DD2-49). q/ctrl+c auf einem Top-Level-View
// (Columns, Tree, Detail-Fokus, Picker) öffnet keinen sofortigen tea.Quit mehr,
// sondern einen kleinen Confirm-Prompt: y/enter beendet, n/esc bricht ab.
// Sub-Formulare und andere Modals fangen q/ctrl+c weiterhin selbst ab (sie liegen
// im handleKey-Dispatch vor diesem Pfad) und brechen direkt ab — ohne zweiten Prompt.

import (
	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

// requestQuit öffnet den Beenden-Confirm statt direkt zu beenden (DD2-49).
func (m model) requestQuit() (tea.Model, tea.Cmd) {
	m.confirmQuit = true
	m.status = ""
	return m, nil
}

// keyConfirmQuit steuert den Beenden-Prompt: y/enter beendet, n/esc/q bricht ab.
func (m model) keyConfirmQuit(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y", "enter":
		return m, tea.Quit
	case "n", "N", "esc", "q":
		m.confirmQuit = false
		return m, nil
	}
	return m, nil
}

// quitBox rendert den schwebenden Beenden-Confirm.
func (m model) quitBox() string {
	body := "\n" + theme.Dim.Render("DevD-Cockpit wirklich schließen.") + "\n\n"
	body += theme.Accent.Render("y") + theme.Dim.Render(": beenden   ") +
		theme.Accent.Render("n/esc") + theme.Dim.Render(": abbrechen")
	return modalPanel("Beenden?", body, "", clampModalWidth(40, m.width), theme.Mauve)
}
