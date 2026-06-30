package tui

// DD2-176: EIN gemeinsamer Status-Glyph über ALLE Status; die Bedeutung trägt
// allein die Farbe. statusDot darf keinen Form-Switch mehr haben.

import (
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestDD2176_SingleStatusGlyphAllStatuses(t *testing.T) {
	statuses := []string{"new", "refined", "planned", "in_progress", "to_review", "passed", "rejected", "completed", "cancelled"}
	var glyph string
	for i, st := range statuses {
		g := ansi.Strip(statusDot(st))
		if i == 0 {
			glyph = g
			continue
		}
		if g != glyph {
			t.Errorf("statusDot(%q)=%q ≠ statusDot(%q)=%q — DD2-176 verlangt EINEN Glyph für alle Status", st, g, statuses[0], glyph)
		}
	}
	if glyph == "" {
		t.Fatal("statusDot liefert leeren Glyph")
	}
}
