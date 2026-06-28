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

// DD2-140 (PO-Screenshot): langer Titel darf den Count nicht in die nächste Zeile
// drücken — '4 Issues' muss zusammen bleiben, keine Block-Zeile breiter als der
// Modal-Innenraum (sonst terminal-wrap → 'Issues' auf Spalte 0).
func TestAssignSprintMenuLongTitleNoCountOverflow(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	mn := "TUI M1: Weltklasse TUI steht zur Verfügung"
	mid := 42
	m := model{
		width:  120,
		asPick: true,
		asSprints: []api.Sprint{
			{ID: 24, Key: "DD2#24", Name: "Create-Form: PO-Notes statt description + description-Deprecation", Status: "planning", ItemCount: 4, MilestoneID: &mid, MilestoneName: &mn},
		},
		asMenu: listState{length: 1, cursor: 0},
	}
	// Block direkt rendern (ohne Modal-Chrome) und auf Breite prüfen.
	cw := 67
	out := ansi.Strip(m.assignSprintBlock(m.asSprints[0], cw, true))

	// Count ungebrochen.
	if !strings.Contains(out, "4 Issues") {
		t.Errorf("Count '4 Issues' gebrochen oder fehlt: %q", out)
	}
	// Keine Block-Zeile breiter als cw+1 (cw Inhalt + 1 Cursor-Spalte). Vor dem Fix
	// drückte der lange Titel den Count über cw → terminal-wrap.
	for _, ln := range strings.Split(out, "\n") {
		if w := lipgloss.Width(ln); w > cw+1 {
			t.Errorf("Block-Zeile überläuft (%d > %d): %q", w, cw+1, ln)
		}
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
