// Package theme hält die geteilte Catppuccin-Palette + Status-Styles für beide
// Layer (One-Shot-Tabellen + TUI). Single Source der Farben. Macchiato-Variante,
// TrueColor-Hex (Akzent = Mauve).
package theme

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
)

// Catppuccin Macchiato — TrueColor-Hex.
var (
	Rosewater = lipgloss.Color("#f4dbd6")
	Flamingo  = lipgloss.Color("#f0c6c6")
	Pink      = lipgloss.Color("#f5bde6")
	Mauve     = lipgloss.Color("#c6a0f6") // Akzent
	Red       = lipgloss.Color("#ed8796")
	Maroon    = lipgloss.Color("#ee99a0")
	Peach     = lipgloss.Color("#f5a97f")
	Yellow    = lipgloss.Color("#eed49f")
	Green     = lipgloss.Color("#a6da95")
	Teal      = lipgloss.Color("#8bd5ca")
	Sky       = lipgloss.Color("#91d7e3")
	Sapphire  = lipgloss.Color("#7dc4e4")
	Blue      = lipgloss.Color("#8aadf4")
	Lavender  = lipgloss.Color("#b7bdf8")

	Text    = lipgloss.Color("#cad3f5")
	Subtext = lipgloss.Color("#a5adcb")
	Overlay = lipgloss.Color("#8087a2")
	Surface = lipgloss.Color("#494d64")
	Base    = lipgloss.Color("#24273a") // App-Hintergrund (opakes Modal)
	Mantle  = lipgloss.Color("#1e2030")
	Crust   = lipgloss.Color("#181926")

	Header = lipgloss.NewStyle().Bold(true).Foreground(Mauve)
	Key    = lipgloss.NewStyle().Foreground(Lavender)
	Accent = lipgloss.NewStyle().Foreground(Mauve)
	Dim    = lipgloss.NewStyle().Foreground(Overlay)
)

var statusColor = map[string]lipgloss.Color{
	"planning":    Yellow,
	"active":      Green,
	"review":      Peach,
	"completed":   Overlay,
	"closed":      Overlay,
	"cancelled":   Red,
	"new":         Sky,
	"refined":     Teal,
	"planned":     Blue,
	"in_progress": Yellow,
	"to_review":   Peach,
	"passed":      Green,
	"done":        Overlay,
	"rejected":    Red,
}

// StatusStyle liefert den lipgloss-Style für einen Status (Default: Subtext).
func StatusStyle(status string) lipgloss.Style {
	if col, ok := statusColor[status]; ok {
		return lipgloss.NewStyle().Foreground(col)
	}
	return lipgloss.NewStyle().Foreground(Subtext)
}

// --- Issue-Type Text-Icons (kein Emoji — Unicode-Geometrie, monospace-sicher) ---

var typeIcon = map[string]string{
	"bug":         "◆",
	"feature":     "✦",
	"improvement": "▲",
	"core":        "⬢",
}

var typeColor = map[string]lipgloss.Color{
	"bug":         Red,
	"feature":     Mauve,
	"improvement": Blue,
	"core":        Peach,
}

// TypeIcon liefert das gefärbte Text-Icon eines Issue-Typs (Fallback: "•").
func TypeIcon(t string) string {
	ic, ok := typeIcon[t]
	if !ok {
		ic = "•"
	}
	col := typeColor[t]
	if col == "" {
		col = Subtext
	}
	return lipgloss.NewStyle().Foreground(col).Render(ic)
}

// TypeStyle färbt einen Typ-Text.
func TypeStyle(t string) lipgloss.Style {
	col := typeColor[t]
	if col == "" {
		col = Subtext
	}
	return lipgloss.NewStyle().Foreground(col)
}

// --- Priorität: P1 (kritisch) … P5 (niedrig), farblich abgestuft ---

func priorityColor(p int) lipgloss.Color {
	switch p {
	case 1:
		return Red
	case 2:
		return Peach
	case 3:
		return Yellow
	case 4:
		return Subtext
	default:
		return Overlay
	}
}

// Priority rendert "P<n>" gefärbt (P1/P2 fett zur Hervorhebung).
func Priority(p int) string {
	st := lipgloss.NewStyle().Foreground(priorityColor(p))
	if p <= 2 {
		st = st.Bold(true)
	}
	return st.Render(fmt.Sprintf("P%d", p))
}
