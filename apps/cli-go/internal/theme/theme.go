// Package theme hält die geteilte Catppuccin-Palette + Status-Styles für beide
// Layer (One-Shot-Tabellen + TUI). Single Source der Farben. Macchiato-Variante,
// TrueColor-Hex (Akzent = Mauve).
package theme

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// asciiIcons — DD2-194: opt-in ASCII-Ersatz-Glyphen für Terminals/Fonts, die die
// (EAW-neutrale, aber font-seitig schwach abgedeckte) Unicode-Geometrie nicht
// darstellen — z.B. WezTerm/macOS mit Standard-Font: Glyph fehlt → Tofu/leer.
// ASCII ist garantiert verfügbar UND EAW=Neutral (kein Spalten-Drift, DD2-53).
// Aktiv via DEVD_ASCII_ICONS=1|true|yes|on. Pro Aufruf gelesen (Render ist nicht
// perf-kritisch) → auch in Tests setz-/rücksetzbar.
func asciiIcons() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("DEVD_ASCII_ICONS"))) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}

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

	Dim = lipgloss.NewStyle().Foreground(Overlay)
	// Muted = Hinweis/Erklärung (D01): Shortcuts, Sub-Label, Placeholder.
	// Bewusst Hint #7c7c7c, nicht Overlay (= Feld-Border).
	Muted = lipgloss.NewStyle().Foreground(Hint)
	// Chevron = struktureller Marker `>`/`o` (D03), Peach.
	Chevron = lipgloss.NewStyle().Foreground(Peach)
)

// SetAccent überschreibt den Akzentstil (Cursor/Header) mit einer User-Farbe
// (DD2-40: theme.accent aus der YAML-Config). hex muss bereits validiert sein
// (#rrggbb). Globale Theme-Mutation — nur einmal beim TUI-Start aufrufen.
func SetAccent(hex string) {
	c := lipgloss.Color(hex)
	Accent = lipgloss.NewStyle().Foreground(c)
	Header = lipgloss.NewStyle().Bold(true).Foreground(c)
}

var statusColor = map[string]lipgloss.Color{
	"new":         Sky,
	"refined":     Teal,
	"planned":     Blue,
	"in_progress": Yellow,
	"to_review":   Peach,
	"passed":      Green,
	"rejected":    Red,
	"completed":   Overlay,
	"cancelled":   Red,
}

// StatusStyle liefert den lipgloss-Style für einen Status (Default: Subtext).
func StatusStyle(status string) lipgloss.Style {
	if col, ok := statusColor[status]; ok {
		return lipgloss.NewStyle().Foreground(col)
	}
	return lipgloss.NewStyle().Foreground(Subtext)
}

// statusGlyph — DD2-176: EIN gemeinsamer Glyph für ALLE Status; die Bedeutung
// trägt allein die Farbe (StatusStyle). PO-Wunsch „gleiches Icon, verschiedene
// Farben" — einfacher + konsistent, in_progress hebt sich über seine Farbe ab
// statt über eine eigene Form. Glyph EAW=Neutral (DD2-53); Coverage-/macOS-
// Sichtbarkeit gemeinsam mit DD2-194 entschieden.
const statusGlyph = "◉"      // U+25C9 FISHEYE (neutral; war ● U+25CF = ambiguous)
const statusGlyphASCII = "*" // DD2-194: ASCII-Ersatz (garantiert darstellbar, neutral)

// statusIconGlyph wählt den Status-Glyph (DD2-194 ASCII-Fallback berücksichtigt).
func statusIconGlyph() string {
	if asciiIcons() {
		return statusGlyphASCII
	}
	return statusGlyph
}

// StatusIcon liefert den einheitlichen, statusgefärbten Status-Glyph (Single
// Source — statusDot ruft nur noch das hier, kein hardcodierter Switch mehr).
func StatusIcon(status string) string {
	return StatusStyle(status).Render(statusIconGlyph())
}

// --- Issue-Type Text-Icons (kein Emoji — Unicode-Geometrie, monospace-sicher) ---

// DD2-53: ALLE Glyphen hier MÜSSEN East-Asian-Width = Neutral/Narrow sein (nie
// Ambiguous). lipgloss.Width zählt sie via clipperhouse/displaywidth als 1; ein
// ambiguous=wide-Terminal (tmux/CJK) rendert Ambiguous aber als 2 → Spalten
// verrutschen (gleiche Klasse wie B06, nur terminalseitig). Da wir die Terminal-
// Seite nicht steuern, ist die einzige robuste Wahl: unambiguous-narrow Glyphen
// (runewidth.EastAsianWidth=false wirkt NICHT — lipgloss nutzt displaywidth, nicht
// go-runewidth). Klassifikation: golang.org/x/text/width.LookupRune(r).Kind().
var typeIcon = map[string]string{
	"bug":         "⯁", // U+2BC1 BLACK MEDIUM DIAMOND (neutral; war ◆ U+25C6 = ambiguous)
	"feature":     "✦", // U+2726 (neutral)
	"improvement": "⯅", // U+2BC5 BLACK MEDIUM UP-POINTING TRIANGLE (neutral; war ▲ U+25B2 = ambiguous)
	"core":        "⬢", // U+2B22 (neutral)
}

var typeColor = map[string]lipgloss.Color{
	"bug":         Red,
	"feature":     Mauve,
	"improvement": Blue,
	"core":        Peach,
}

// typeIconASCII — DD2-194: ASCII-Ersatz je Typ (garantiert darstellbar, EAW-Neutral),
// aktiv via DEVD_ASCII_ICONS. Distinkt pro Typ, damit der Typ ohne Farbe erkennbar bleibt.
var typeIconASCII = map[string]string{
	"bug":         "!",
	"feature":     "+",
	"improvement": "^",
	"core":        "#",
}

// typeGlyph wählt den Type-Glyph (DD2-194 ASCII-Fallback berücksichtigt; Fallback-
// Glyph für unbekannte Typen: "∙" bzw. "." im ASCII-Modus).
func typeGlyph(t string) string {
	if asciiIcons() {
		if ic, ok := typeIconASCII[t]; ok {
			return ic
		}
		return "."
	}
	if ic, ok := typeIcon[t]; ok {
		return ic
	}
	return "∙" // U+2219 (neutral; war • U+2022 = ambiguous)
}

// TypeIcon liefert das gefärbte Text-Icon eines Issue-Typs (Fallback: "∙" / ".").
func TypeIcon(t string) string {
	col := typeColor[t]
	if col == "" {
		col = Subtext
	}
	return lipgloss.NewStyle().Foreground(col).Render(typeGlyph(t))
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
