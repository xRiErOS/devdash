package tui

import "testing"

// DD2-66: User-Stories werden zeilenweise eingegeben — splitLines trimmt und wirft
// leere Zeilen weg, damit Leerzeilen/abschließende Newlines keine leeren Stories
// erzeugen (Backend würde title-Pflicht-Validierung 400en).
func TestSplitLinesDropsBlankAndTrims(t *testing.T) {
	got := splitLines("  Story A  \n\n Story B\n\n\n")
	want := []string{"Story A", "Story B"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d (%q)", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestSplitLinesEmptyIsNil(t *testing.T) {
	if got := splitLines("   \n  \n"); got != nil {
		t.Errorf("erwartet nil bei nur Leerzeilen, bekam %q", got)
	}
}
