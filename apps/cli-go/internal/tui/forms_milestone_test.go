package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-27: Sprint-Form-Select zeigt nur offene/aktive Meilensteine.
func TestOpenMilestonesFiltersClosed(t *testing.T) {
	in := []api.Milestone{
		{ID: 1, Name: "A", Status: "in_progress"},
		{ID: 2, Name: "B", Status: "new"},
		{ID: 3, Name: "C", Status: "completed"},
		{ID: 4, Name: "D", Status: "cancelled"},
		{ID: 5, Name: "E", Status: "completed"},
	}
	got := openMilestones(in)
	if len(got) != 2 {
		t.Fatalf("len=%d, want 2 (nur new+in_progress)", len(got))
	}
	for _, m := range got {
		if m.Status != "new" && m.Status != "in_progress" {
			t.Errorf("unerwarteter Status %q im Ergebnis", m.Status)
		}
	}
}
