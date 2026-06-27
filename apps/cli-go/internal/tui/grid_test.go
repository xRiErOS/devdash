package tui

// DD2-38: Grid-Primitiv — zweispaltige (n-spaltige) Detail-Sektionen aus Weights
// (Golden Rule #4) statt Pixeln, je Zelle truncatet (kein Auto-Wrap, #2), auf
// gemeinsame Höhe gefüllt. Basis für DD2-50 (Accordion) + DD2-63 (Meta-Strip).

import (
	"strings"
	"testing"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// Weights 2:1 → Spaltenbreiten proportional; jede gerenderte Zeile ist exakt
// totalWidth Spalten breit (feste Spaltenbreiten ⇒ deckungsgleiche Ränder).
func TestGridWeightedWidths(t *testing.T) {
	out := grid(60, 2,
		gridCell{weight: 2, content: "links"},
		gridCell{weight: 1, content: "rechts"})
	for i, ln := range strings.Split(out, "\n") {
		if w := lipgloss.Width(ln); w != 60 {
			t.Errorf("Zeile %d Breite %d, want 60 (Spalten driften)", i, w)
		}
	}
	flat := ansi.Strip(out)
	if !strings.Contains(flat, "links") || !strings.Contains(flat, "rechts") {
		t.Errorf("beide Spalten-Inhalte fehlen: %q", flat)
	}
}

// Lange Zeile wird auf die Spaltenbreite truncatet, NICHT umgebrochen — die
// Ausgabe-Höhe bleibt = max(Eingabe-Zeilen), kein heimlicher Extra-Umbruch (#2).
func TestGridTruncatesNoWrap(t *testing.T) {
	long := strings.Repeat("x", 200)
	out := grid(40, 1,
		gridCell{weight: 1, content: long},
		gridCell{weight: 1, content: "y"})
	if h := len(strings.Split(out, "\n")); h != 1 {
		t.Fatalf("Höhe %d, want 1 (Auto-Wrap statt Truncate?)", h)
	}
	if strings.Contains(ansi.Strip(out), strings.Repeat("x", 200)) {
		t.Errorf("lange Zeile nicht truncatet")
	}
}

// Ungleiche Zeilenzahl → beide Spalten auf gemeinsame Höhe gefüllt, sonst
// rutscht JoinHorizontal die kürzere Spalte hoch.
func TestGridFillsToCommonHeight(t *testing.T) {
	out := grid(40, 1,
		gridCell{weight: 1, content: "a\nb\nc"},
		gridCell{weight: 1, content: "x"})
	if h := len(strings.Split(out, "\n")); h != 3 {
		t.Fatalf("Höhe %d, want 3 (gemeinsame Höhe)", h)
	}
	for i, ln := range strings.Split(out, "\n") {
		if w := lipgloss.Width(ln); w != 40 {
			t.Errorf("Zeile %d Breite %d, want 40", i, w)
		}
	}
}

// TrueColor-Guard (B06-Klasse): unter echter Farbe muss die rechte Spalte an der
// gleichen sichtbaren Spalte beginnen wie im Ascii-Profil — Padding ist
// ANSI-/runewidth-bewusst (lipgloss.Width), nicht byte-basiert.
func TestGridRightColumnAlignsUnderColor(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	out := grid(60, 2,
		gridCell{weight: 2, content: theme.Accent.Render("farbig")},
		gridCell{weight: 1, content: "rechts"})
	line := strings.Split(out, "\n")[0]
	// linke Spaltenbreite bei avail=58, Weight 2:3 → 38; rechte Spalte beginnt
	// nach 38 + 2 (gap) = 40 sichtbaren Spalten.
	stripped := ansi.Strip(line)
	idx := strings.Index(stripped, "rechts")
	if idx < 0 {
		t.Fatalf("rechte Spalte fehlt: %q", stripped)
	}
	if col := lipgloss.Width(stripped[:idx]); col != 40 {
		t.Errorf("rechte Spalte beginnt bei Spalte %d, want 40 (Farb-Misalignment)", col)
	}
	if w := lipgloss.Width(line); w != 60 {
		t.Errorf("Zeile unter Farbe Breite %d, want 60", w)
	}
}
