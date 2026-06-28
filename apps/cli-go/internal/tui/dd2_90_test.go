package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
)

// DD2-90 Rework: das Issue-Abnahme-Modal skaliert mit der Terminalbreite (war
// vorher fix 64 → auf breiten Terminals winzig). Breites Terminal → breites Modal.
func TestUserStoryModalScalesWithTerminal(t *testing.T) {
	mk := func(termW int) string {
		m := reviewModel()
		m.width = termW
		m.height = 50
		g := strings.Repeat("long goal word ", 20)
		bg := strings.Repeat("background sentence ", 30)
		m.curSprint.Items[0].Goal = &g
		m.curSprint.Items[0].Background = &bg
		m.rlist.cursor = 0
		return m.userStoryModal()
	}
	wideW := lipgloss.Width(mk(200))
	narrowW := lipgloss.Width(mk(80))
	if wideW <= 70 {
		t.Errorf("breites Modal width=%d, want >70 (skaliert mit Terminal)", wideW)
	}
	if wideW <= narrowW {
		t.Errorf("Modal soll mit Terminalbreite wachsen: wide=%d narrow=%d", wideW, narrowW)
	}
}

// Höhen-Guard: ein sehr langes Modal überschreitet die Terminalhöhe nicht
// (placeOverlay würde sonst unten clippen), und der Footer bleibt erhalten.
func TestUserStoryModalHeightGuard(t *testing.T) {
	m := reviewModel()
	m.width = 120
	m.height = 20
	huge := strings.Repeat("zeile\n", 200)
	m.curSprint.Items[0].Background = &huge
	m.rlist.cursor = 0
	out := m.userStoryModal()
	if h := lipgloss.Height(out); h > m.height {
		t.Errorf("Modal-Höhe %d überschreitet Terminalhöhe %d", h, m.height)
	}
	if !strings.Contains(out, "a:accept") {
		t.Error("Footer (Keybindings) soll trotz Höhen-Guard sichtbar bleiben")
	}
}
