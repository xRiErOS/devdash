package tui

import (
	"fmt"
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

// Nebenbefund DD2#25-Review: die Master-Liste im Review-Cockpit fensterte nicht um
// den Cursor — borderedPane cappte hart auf die ersten h Zeilen, das selektierte
// Issue verschwand bei langen Sprints unten. reviewMasterPane fenstert jetzt.
func TestReviewMasterPaneWindowsToCursor(t *testing.T) {
	m := reviewModel()
	items := make([]api.Issue, 30)
	for i := range items {
		items[i] = api.Issue{Key: fmt.Sprintf("SPF-%d", i+1), Title: "T", Status: "to_review"}
	}
	m.curSprint.Items = items
	m.rlist.setLen(30)
	m.rlist.cursor = 27 // weit unten → SPF-28

	out := ansi.Strip(m.reviewMasterPane(30, 12)) // kleine Pane-Höhe erzwingt Fenstern
	if !strings.Contains(out, "SPF-28") {
		t.Errorf("selektiertes Issue SPF-28 nicht im gefensterten Master sichtbar:\n%s", out)
	}
}
