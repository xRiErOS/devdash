package tui

// DD2-86-Folge: placeOverlay muss das Modal OPAK rendern — auch wenn die fg-Zeilen
// unterschiedlich breit sind (huh-Form-Hilfszeile/Leerzeilen sind schmaler als die
// Box). Sonst decken kurze Zeilen den Hintergrund nicht und der Text dahinter
// blutet durch (PO-Befund: transparenter Form-Footer).

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestPlaceOverlayOpaqueRaggedLines(t *testing.T) {
	row := strings.Repeat("X", 20)
	bg := row + "\n" + row + "\n" + row
	// fg: breit/schmal/breit (8/2/8) — die schmale Zeile darf NICHT durchbluten.
	fg := "ABCDEFGH\nCD\nABCDEFGH"
	out := placeOverlay(bg, fg, 20, 3)
	lines := strings.Split(out, "\n")

	// Modal ist 8 breit, zentriert über 20 → belegt 8 Spalten; jede Modal-Zeile
	// muss exakt 8 Hintergrund-Zeichen verdecken (20-8 = 12 X bleiben je Zeile).
	for i, l := range lines {
		if got := strings.Count(ansi.Strip(l), "X"); got != 12 {
			t.Errorf("Zeile %d: %d X übrig, want 12 (Modal verdeckt 8) — %q", i, got, ansi.Strip(l))
		}
	}
}
