package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/config"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-40 → DD2-228: layout.tree_width fließt durch treeLayout in die Baum-Spaltenbreite.
// Seit DD2-228 ist tree_width MINDESTBREITE (Floor), nicht mehr Fixbreite (Pin):
// treeLayout delegiert die Pane-Breite an den Goldstandard masterDetailWidths (1fr:2fr,
// tree_width als Floor). Der Test sichert die Delegation + die Floor-Semantik.
func TestTreeWidthFromConfig(t *testing.T) {
	treeLW := func(width, tw int) int {
		m := model{width: width, height: 40}
		m.cfg = config.Settings{Layout: config.LayoutSettings{TreeWidth: tw}}
		_, _, lw, _, _ := m.treeLayout()
		return lw
	}
	helperLW := func(width, tw int) int {
		m := model{width: width, height: 40}
		m.cfg = config.Settings{Layout: config.LayoutSettings{TreeWidth: tw}}
		lw, _ := m.masterDetailWidths(m.termWidth())
		return lw
	}
	// treeLayout muss exakt dem Helper folgen — keine eigene Breitenformel mehr.
	for _, tc := range []struct{ width, tw int }{{200, 30}, {130, 50}, {200, 0}} {
		if got, want := treeLW(tc.width, tc.tw), helperLW(tc.width, tc.tw); got != want {
			t.Errorf("treeLayout(width=%d, tree_width=%d) lw=%d, want masterDetailWidths=%d (Delegation)", tc.width, tc.tw, got, want)
		}
	}
	// Floor-Semantik: auf schmalem Terminal hebt tree_width die Spalte über 1fr (w/3).
	if lw := treeLW(130, 50); lw <= 130/3 {
		t.Errorf("tree_width=50 als Mindestbreite: lw=%d sollte über 1fr (≈%d) liegen", lw, 130/3)
	}
}

// DD2-40: layout.modal_width überschreibt die Standard-Modalbreite (Clamp bleibt).
func TestModalWidthFromConfig(t *testing.T) {
	old := defaultModalWidth
	defer func() { defaultModalWidth = old }()
	defaultModalWidth = 50
	if got := modalBoxWidth(200); got != 50 {
		t.Errorf("modalBoxWidth(200) mit default=50 → %d, want 50", got)
	}
	if got := modalBoxWidth(40); got != 36 { // schmal: 40-4
		t.Errorf("modalBoxWidth(40) → %d, want 36 (Clamp greift weiter)", got)
	}
}

// DD2-40: theme.accent überschreibt den Akzentstil global.
func TestThemeSetAccent(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)
	oldA, oldH := theme.Accent, theme.Header
	defer func() { theme.Accent, theme.Header = oldA, oldH }()
	theme.SetAccent("#ff0000")
	if !strings.Contains(theme.Accent.Render("x"), "255;0;0") {
		t.Errorf("SetAccent(#ff0000) hat Accent nicht auf Rot gesetzt: %q", theme.Accent.Render("x"))
	}
}
