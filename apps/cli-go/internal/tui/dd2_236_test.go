package tui

import (
	"testing"

	"github.com/charmbracelet/lipgloss"
)

// DD2-236: Das Review-Cockpit muss die volle Terminalhöhe füllen wie jeder andere
// gerahmte View — der gerenderte Frame ist exakt m.height Zeilen hoch (kein
// abgeschnittener Rest unten). Der alte "+ 3"-Trennzeilen-Abzug machte die Panes
// 3 Zeilen zu kurz → Frame endete vor dem unteren Rand.
func TestDD2236ReviewSprintFillsFullHeight(t *testing.T) {
	for _, h := range []int{24, 30, 40, 50} {
		m := reviewModel()
		m.width, m.height = 120, h
		out := m.viewReviewSprint()
		if got := lipgloss.Height(out); got != h {
			t.Errorf("height=%d: viewReviewSprint Frame %d Zeilen, erwartet %d (volle Höhe)", h, got, h)
		}
	}
}
