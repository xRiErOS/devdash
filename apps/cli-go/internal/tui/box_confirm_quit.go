package tui

// box_confirm_quit.go — Beenden-Bestätigung (DD2-49). q/ctrl+c auf einem Top-Level-View
// (Columns, Tree, Detail-Fokus, Picker) öffnet keinen sofortigen tea.Quit mehr,
// sondern einen kleinen Confirm-Prompt: enter beendet, n/esc bricht ab (DD2-174:
// Dialoge nur noch enter=confirm, esc/n=cancel — y/Y/q raus).
// Sub-Formulare und andere Modals fangen q/ctrl+c weiterhin selbst ab (sie liegen
// im handleKey-Dispatch vor diesem Pfad) und brechen direkt ab — ohne zweiten Prompt.

import (
	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

// requestQuit öffnet den Beenden-Confirm statt direkt zu beenden (DD2-49).
func (m model) requestQuit() (tea.Model, tea.Cmd) {
	m.confirmQuit = true
	m.status = ""
	return m, nil
}

// keyConfirmQuit steuert den Beenden-Prompt: enter beendet, n/esc bricht ab (DD2-174).
func (m model) keyConfirmQuit(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch {
	case keybind.Matches(msg, keys.Enter):
		return m, tea.Quit
	case keybind.Matches(msg, keys.Back), msg.String() == "n":
		m.confirmQuit = false
		return m, nil
	}
	return m, nil
}

// quitBox rendert den schwebenden Beenden-Confirm.
func (m model) quitBox() string {
	body := "\n" + theme.Dim.Render("Really close the DevD cockpit.") + "\n\n"
	body += theme.Accent.Render("enter") + theme.Dim.Render(": quit   ") +
		theme.Accent.Render("n/esc") + theme.Dim.Render(": cancel")
	return modalPanel("Quit?", body, "", clampModalWidth(40, m.width), theme.Mauve)
}
