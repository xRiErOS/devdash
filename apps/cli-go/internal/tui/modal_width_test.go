package tui

import "testing"

// DD2-55: Alle schwebenden Modal-Boxen (status/sprintStatus/milestoneStatus/
// filter/userStory/cascade/delete/palette/assign-Menüs) routen ihre Breite durch
// clampModalWidth — daher genügt dieser Vertrag als Beweis: Wunschbreite bleibt
// auf breiten Terminals, schrumpft auf termW-4, Untergrenze 24.
func TestClampModalWidth(t *testing.T) {
	cases := []struct{ pref, termW, want int }{
		{64, 200, 64}, // breit genug: Wunschbreite bleibt
		{46, 200, 46},
		{30, 200, 30},
		{64, 40, 36}, // schmal: termW-4 (lässt Border/Luft)
		{48, 50, 46}, // knapp: 50-4=46 < 48
		{30, 28, 24}, // sehr schmal: Untergrenze 24
		{64, 0, 64},  // Init/unbekannte Breite (termW<=4): nicht clampen, Wunsch bleibt
	}
	for _, c := range cases {
		if got := clampModalWidth(c.pref, c.termW); got != c.want {
			t.Errorf("clampModalWidth(%d, %d) = %d, want %d", c.pref, c.termW, got, c.want)
		}
	}
	// modalBoxWidth ist clampModalWidth mit pref=64.
	if got, want := modalBoxWidth(40), clampModalWidth(64, 40); got != want {
		t.Errorf("modalBoxWidth(40) = %d, want %d (== clampModalWidth(64,40))", got, want)
	}
}
