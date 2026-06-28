package tui

// DD2-140 (PO-Test #4): Sprint-Assign-Picker als größeres Block-Layout — Key führt,
// Titel umbricht, Issue-Count rechts, Meilenstein-Zeile darunter.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

func TestAssignSprintMenuBlockLayout(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	mn := "Meilenstein Eins mit langem Namen"
	mid := 42
	m := model{
		width:  120,
		asPick: true,
		asSprints: []api.Sprint{
			{ID: 28, Key: "DD2#28", Name: "Sprint Title der auch deutlich länger sein kann und umbrechen muss in der Anzeige", Status: "active", ItemCount: 4, MilestoneID: &mid, MilestoneName: &mn},
			{ID: 29, Key: "DD2#29", Name: "Kurz", Status: "planning", ItemCount: 3},
		},
		asMenu: listState{length: 2, cursor: 0},
	}
	out := ansi.Strip(m.assignSprintMenu())

	if !strings.Contains(out, "DD2#28") {
		t.Errorf("Sprint-Key fehlt: %q", out)
	}
	if !strings.Contains(out, "4 Issues") {
		t.Errorf("Issue-Count fehlt: %q", out)
	}
	if !strings.Contains(out, "Meilenstein:") || !strings.Contains(out, "42") {
		t.Errorf("Meilenstein-Zeile (mit ID) fehlt: %q", out)
	}
	// Titel umbricht → das Titel-Ende steht auf einer Folgezeile.
	flat := strings.Join(strings.Fields(out), " ")
	if !strings.Contains(flat, "umbrechen muss in der Anzeige") {
		t.Errorf("Titel-Ende nach Umbruch fehlt: %q", flat)
	}
	// Sprint ohne Meilenstein wird sauber gelabelt.
	if !strings.Contains(out, "kein Meilenstein") {
		t.Errorf("Sprint ohne Meilenstein nicht gelabelt: %q", out)
	}
}

// Cursor-Block ist markiert (Balken).
func TestAssignSprintMenuCursorBar(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)
	m := model{
		width:     120,
		asPick:    true,
		asSprints: []api.Sprint{{ID: 1, Key: "DD2#1", Name: "A", Status: "active", ItemCount: 1}},
		asMenu:    listState{length: 1, cursor: 0},
	}
	out := ansi.Strip(m.assignSprintMenu())
	if !strings.Contains(out, "▌") {
		t.Errorf("Cursor-Balken fehlt im selektierten Block: %q", out)
	}
}
