package tui

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestPlaceOverlayPreservesHeight(t *testing.T) {
	bg := strings.Repeat("..........\n", 10)
	bg = strings.TrimRight(bg, "\n")
	fg := "XXXX\nXXXX"
	out := placeOverlay(bg, fg, 10, 10)
	if got := len(strings.Split(out, "\n")); got != 10 {
		t.Fatalf("Zeilen=%d, want 10 (Höhe bleibt)", got)
	}
	if !strings.Contains(out, "XXXX") {
		t.Error("fg nicht im Ergebnis")
	}
	// Hintergrund rundherum noch sichtbar
	if !strings.Contains(out, "..........") {
		t.Error("bg-Zeile oben/unten verloren")
	}
}

func TestSpliceLineKeepsWidth(t *testing.T) {
	bg := strings.Repeat(".", 20)
	out := spliceLine(bg, "XXX", 5, 3)
	// sichtbare Breite unverändert 20
	if w := ansi.StringWidth(out); w != 20 {
		t.Errorf("Breite=%d, want 20", w)
	}
	if !strings.Contains(out, "XXX") {
		t.Error("fg fehlt")
	}
}
