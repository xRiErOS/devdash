package tui

// DD2-63: Meta-Strip im Detail-Header — Label/Sub-Label-Paare (value voll +
// descriptor Hint, D01) horizontal, Status rechtsbündig.

import (
	"strings"
	"testing"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// Status sitzt rechtsbündig; die Zeile füllt die volle Breite; Sub-Label folgt
// dem Wert. Stripped endet mit dem Status.
func TestMetaStripRightAlignsStatus(t *testing.T) {
	out := metaStrip([]metaPair{
		{"TUI M1", "milestone"},
		{"P1", "prio"},
	}, statusText("to_review"), 60)
	if w := lipgloss.Width(out); w != 60 {
		t.Errorf("Breite %d, want 60", w)
	}
	flat := ansi.Strip(out)
	if !strings.HasSuffix(strings.TrimRight(flat, " "), "to_review") {
		t.Errorf("Status nicht rechtsbündig am Ende: %q", flat)
	}
	if !strings.Contains(flat, "TUI M1 milestone") || !strings.Contains(flat, "P1 prio") {
		t.Errorf("Paare value+sublabel fehlen: %q", flat)
	}
}

// Leere Werte fallen raus (kein nacktes Sub-Label ohne Wert).
func TestMetaStripDropsEmpty(t *testing.T) {
	out := metaStrip([]metaPair{
		{"", "milestone"},
		{"bug", "type"},
	}, "", 50)
	flat := ansi.Strip(out)
	if strings.Contains(flat, "milestone") {
		t.Errorf("leeres Paar nicht entfernt: %q", flat)
	}
	if !strings.Contains(flat, "bug type") {
		t.Errorf("gefülltes Paar fehlt: %q", flat)
	}
}

// D01: das Sub-Label wird muted (Hint) gerendert, der Wert nicht. TrueColor-Guard.
func TestMetaStripSubLabelMuted(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	out := metaStrip([]metaPair{{"bug", "type"}}, "", 40)
	if !strings.Contains(out, theme.Muted.Render("type")) {
		t.Errorf("Sub-Label nicht muted (Hint) gerendert: %q", out)
	}
}

// Schmal: passt der Status nicht mehr, wird links gekürzt, der Status bleibt.
func TestMetaStripNarrowKeepsStatus(t *testing.T) {
	out := metaStrip([]metaPair{
		{"sehr langer Meilenstein-Name der nicht passt", "milestone"},
	}, statusText("active"), 20)
	if w := lipgloss.Width(out); w > 20 {
		t.Errorf("Breite %d überläuft 20", w)
	}
	if !strings.Contains(ansi.Strip(out), "active") {
		t.Errorf("Status bei Engpass verloren: %q", ansi.Strip(out))
	}
}
