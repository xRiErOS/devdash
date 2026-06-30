package tui

// DD2-216: placeOverlay muss eine lückenlose tw×th-Leinwand mit theme.Base liefern.
// Ist die Basis-View schmaler/kürzer als das Terminal (Tree-Base nach Columns-Sunset),
// dürfen die unbelegten Zellen NICHT Terminal-Default (schwarz) zeigen, sondern Base.

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

// Basis schmaler (10) und kürzer (2 Zeilen) als die Leinwand (tw=20, th=5):
// Ausgabe = exakt 5 Zeilen, jede 20 Zellen breit (kein Loch neben/unter der Box).
func TestDD2216_PlaceOverlayFillsFullCanvas(t *testing.T) {
	bg := strings.Repeat("X", 10) + "\n" + strings.Repeat("X", 10)
	fg := "AB\nAB"
	out := placeOverlay(bg, fg, 20, 5)
	lines := strings.Split(out, "\n")

	if len(lines) != 5 {
		t.Fatalf("Leinwand-Zeilen = %d, want 5 (th)", len(lines))
	}
	for i, l := range lines {
		if w := ansi.StringWidth(l); w != 20 {
			t.Errorf("Zeile %d Breite = %d, want 20 (tw) — Loch in der Leinwand: %q", i, w, ansi.Strip(l))
		}
	}
}

// Streifen LINKS der Box: bg-Zeile (8 breit) ist kürzer als der zentrierte Modal-
// Offset → früher plain-space-Pad (schwarz). Jetzt füllt canvasLines die bg-Zeile
// vorab auf tw, sodass spliceLine aus Base schneidet. Verifiziert über die volle
// Zeilenbreite (Loch würde die Breite < tw drücken bzw. plain Lücke lassen).
func TestDD2216_NoBlackStripBesideBox(t *testing.T) {
	bg := strings.Repeat("X", 8) // viel schmaler als tw=30
	fg := "MODAL"
	out := placeOverlay(bg, fg, 30, 1)
	for i, l := range strings.Split(out, "\n") {
		if w := ansi.StringWidth(l); w != 30 {
			t.Errorf("Zeile %d Breite = %d, want 30 — Streifen neben der Box: %q", i, w, ansi.Strip(l))
		}
	}
}
