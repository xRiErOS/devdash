// Package theme hält die geteilte Catppuccin-Palette + Status-Styles für beide
// Layer (One-Shot-Tabellen + TUI). Single Source der Farben.
package theme

import "github.com/charmbracelet/lipgloss"

// Basis-Palette (ANSI-256-Annäherung an Catppuccin; TUI kann später TrueColor).
var (
	Mauve   = lipgloss.Color("99")
	Blue    = lipgloss.Color("111")
	Green   = lipgloss.Color("42")
	Yellow  = lipgloss.Color("226")
	Peach   = lipgloss.Color("214")
	Red     = lipgloss.Color("196")
	Overlay = lipgloss.Color("245")
	Subtext = lipgloss.Color("250")

	Header = lipgloss.NewStyle().Bold(true).Foreground(Mauve)
	Key    = lipgloss.NewStyle().Foreground(Blue)
)

var statusColor = map[string]lipgloss.Color{
	"planning":    Yellow,
	"active":      Green,
	"review":      Peach,
	"completed":   Overlay,
	"closed":      Overlay,
	"cancelled":   Red,
	"new":         Subtext,
	"refined":     Subtext,
	"planned":     Blue,
	"in_progress": Green,
	"to_review":   Peach,
	"passed":      Green,
	"done":        Overlay,
	"rejected":    Red,
}

// StatusStyle liefert den lipgloss-Style für einen Status (Default: unverändert).
func StatusStyle(status string) lipgloss.Style {
	if col, ok := statusColor[status]; ok {
		return lipgloss.NewStyle().Foreground(col)
	}
	return lipgloss.NewStyle()
}
