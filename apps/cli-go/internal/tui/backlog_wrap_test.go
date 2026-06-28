package tui

// DD2-134 (Review-Befund #2): lange Issue-Titel in der Backlog-Liste umbrechen
// (Block je Issue) statt mit … abschneiden.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

func backlogWrapModel() model {
	return model{
		view: viewBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "Ein sehr langer Titel der definitiv über die schmale Listenspalte hinausgeht und umgebrochen werden muss", Type: "bug", Priority: 1, Status: "new"},
			{ID: 2, Key: "DD2-2", Title: "Kurz", Type: "feature", Priority: 2, Status: "new"},
		},
		blist:   listState{length: 2, cursor: 0},
		accOpen: 1,
	}
}

// Ein langer Titel erzeugt einen Block mit mehreren Zeilen (kein …-Truncate).
func TestBacklogListWraps(t *testing.T) {
	m := backlogWrapModel()
	m.blist.cursor = 1 // Cursor auf den kurzen → Block 0 unmarkiert (kein Balken-Interleave)
	blocks := m.backlogListBlocks(m.backlog, 30, true)
	if len(blocks) != 2 {
		t.Fatalf("blocks=%d, want 2", len(blocks))
	}
	if len(blocks[0]) < 2 {
		t.Errorf("langer Titel sollte über mehrere Zeilen umbrechen, got %d Zeilen", len(blocks[0]))
	}
	joined := ansi.Strip(strings.Join(blocks[0], "\n"))
	if strings.Contains(joined, "…") {
		t.Errorf("Titel sollte umgebrochen, nicht truncatet sein: %q", joined)
	}
	// Der volle Titel ist (über die Zeilen verteilt) vollständig vorhanden.
	flat := strings.Join(strings.Fields(joined), " ")
	if !strings.Contains(flat, "umgebrochen werden muss") {
		t.Errorf("Titel-Ende fehlt nach Umbruch: %q", flat)
	}
	if len(blocks[1]) != 1 {
		t.Errorf("kurzer Titel = 1 Zeile, got %d", len(blocks[1]))
	}
}

// windowBlocks hält den Cursor-Block sichtbar und überschreitet die Höhe nicht.
func TestWindowBlocksKeepsCursor(t *testing.T) {
	blocks := [][]string{{"a1", "a2", "a3"}, {"b1"}, {"c1", "c2"}, {"d1"}}
	out := windowBlocks(blocks, 3, 2) // Cursor auf Block c (2 Zeilen)
	if len(out) > 3 {
		t.Errorf("window überschreitet Höhe: %d > 3", len(out))
	}
	if !contains(out, "c1") || !contains(out, "c2") {
		t.Errorf("Cursor-Block c nicht vollständig sichtbar: %v", out)
	}
}

// Der Cursor-Block ist im Render markiert (Balken auf jeder Block-Zeile).
func TestBacklogListBlockCursorBar(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)
	m := backlogWrapModel()
	blocks := m.backlogListBlocks(m.backlog, 30, true)
	for _, ln := range blocks[0] { // Cursor-Block
		if !strings.Contains(ansi.Strip(ln), "▌") {
			t.Errorf("jede Cursor-Block-Zeile braucht den Balken ▌: %q", ansi.Strip(ln))
		}
	}
}

func contains(lines []string, sub string) bool {
	for _, l := range lines {
		if strings.Contains(ansi.Strip(l), sub) {
			return true
		}
	}
	return false
}
