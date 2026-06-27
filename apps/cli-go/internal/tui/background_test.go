package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-24: paintBackground legt den Base-Hintergrund (#24273a) unter jede Zeile
// und füllt auf die Zielhöhe auf.
func TestPaintBackgroundAddsBaseBg(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	out := paintBackground("hallo\nwelt", 20, 4)
	if !strings.Contains(out, "48;2;36;39;58") {
		t.Error("Base-Background (#24273a) fehlt nach paintBackground")
	}
	if n := len(strings.Split(out, "\n")); n != 4 {
		t.Errorf("Höhe=%d, want 4 (auf h aufgefüllt)", n)
	}
}
