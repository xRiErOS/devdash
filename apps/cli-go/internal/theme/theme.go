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
	Overlay = lipgloss.Color("#8087a2") // Input-/Feld-Border
	Surface = lipgloss.Color("#494d64")
	Base    = lipgloss.Color("#24273a") // App-/Body-Hintergrund
	Mantle  = lipgloss.Color("#1e2030") // Header-/Accordion-Header-BG
	Crust   = lipgloss.Color("#181926") // Form-Rahmen-BG (Modal-Backdrop)

	// Hint = Hinweis/Erklärung (Labels, Sub-Label, Shortcuts, Placeholder,
	// inaktive Tabs). Zwei-Klassen-Text-Regel (D01): muted ggü. echter Info.
	// Bewusst ≠ Overlay (#8087a2 = Feld-Border).
	Hint = lipgloss.Color("#7c7c7c")
	// Select = Interaktions-/Auswahl-Signal (aktiver huh.Select-Button), laut
	// (Latte-Peach). Bewusst ≠ Peach #f5a97f (struktureller Akzent), D02.
	Select = lipgloss.Color("#fe640b")

	Header = lipgloss.NewStyle().Bold(true).Foreground(Mauve)
	Key    = lipgloss.NewStyle().Foreground(Sapphire) // IDs/Keys = Sapphire (D-Mapping Wireframe)
	Accent = lipgloss.NewStyle().Foreground(Mauve)
	Dim    = lipgloss.NewStyle().Foreground(Overlay)
	// Muted = Hinweis/Erklärung (D01): Shortcuts, Sub-Label, Placeholder.
	// Bewusst Hint #7c7c7c, nicht Overlay (= Feld-Border).
	Muted = lipgloss.NewStyle().Foreground(Hint)
	// Chevron = struktureller Marker `>`/`o` (D03), Peach.
	Chevron = lipgloss.NewStyle().Foreground(Peach)
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

// priorityColor: Ampel-Schema cli-go-weit (D04). Rot=dringend, weiß=neutral,
// grün=entspannt. Bewusste Divergenz vom React-Frontend (danger/warning/info/
// neutral) — anderes Surface.
func priorityColor(p int) lipgloss.Color {
	switch p {
	case 1, 2: // kritisch/hoch
		return Red
	case 3: // mittel
		return Text
	default: // P4 niedrig (und tiefer)
		return Green
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
