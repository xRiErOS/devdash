package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/config"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// DD2-40: layout.tree_width fließt durch treeLayout in die Baum-Spaltenbreite.
func TestTreeWidthFromConfig(t *testing.T) {
	mkLayout := func(tw int) int {
		m := model{width: 200, height: 40}
		m.cfg = config.Settings{Layout: config.LayoutSettings{TreeWidth: tw}}
		_, _, lw, _, _ := m.treeLayout()
		return lw
	}
	if lw := mkLayout(30); lw != 30 {
		t.Errorf("tree_width=30 → lw=%d, want 30", lw)
	}
	if lw := mkLayout(0); lw != 36 {
		t.Errorf("tree_width=0 (zero-Config) → lw=%d, want 36 (Default)", lw)
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
