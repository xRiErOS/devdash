package tui

// help.go — In-App-Shortcut-Übersicht (DD2-31). ? öffnet ein Overlay, das die
// zentrale Keymap (DD2-47) gruppiert rendert. Die Tasten-Labels und Texte kommen
// aus key.Binding.Help() — Single-Source, driftet nicht gegen die echten Bindings.

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
)

// helpBox rendert die schwebende Shortcut-Übersicht aus keys.helpGroups().
func (m model) helpBox() string {
	groups := keys.helpGroups()

	// Spaltenbreite für das Tasten-Label global bestimmen (ANSI-sicher).
	keyW := 0
	for _, g := range groups {
		for _, b := range g.bindings {
			if w := lipgloss.Width(b.Help().Key); w > keyW {
				keyW = w
			}
		}
	}

	var b strings.Builder
	b.WriteString(theme.Header.Render("Tastatur-Shortcuts") + "\n")
	for _, g := range groups {
		b.WriteString("\n" + theme.Accent.Render(g.title) + "\n")
		for _, bind := range g.bindings {
			h := bind.Help()
			pad := strings.Repeat(" ", keyW-lipgloss.Width(h.Key))
			b.WriteString("  " + theme.Header.Render(h.Key) + pad + "  " + theme.Dim.Render(h.Desc) + "\n")
		}
	}
	b.WriteString("\n" + theme.Dim.Render("esc/?/q: schließen"))

	return lipgloss.NewStyle().
		Width(clampModalWidth(54, m.width)). // DD2-55: auf Terminalbreite clampen
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}
