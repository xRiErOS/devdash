package tui

// DD2-189: Backlog-Block = Header (Marker+Prio+Key) in Zeile 1, Titel ab Zeile 2
// hängend exakt unter dem IssueKey. Kein Titel mehr in der Header-Zeile.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func dd2189Model() model {
	return model{
		view: viewBrowseBacklog,
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "Ein Titel der sauber unter dem IssueKey hängt und ggf umbricht", Type: "bug", Priority: 2, Status: "new"},
			{ID: 2, Key: "DD2-2", Title: "Anker", Type: "feature", Priority: 3, Status: "new"},
		},
		blist:   listState{length: 2, cursor: 1}, // Block 0 unmarkiert (kein ▌-Interleave)
		accOpen: 1,
	}
}

func TestDD2189_TitleHangsUnderKey(t *testing.T) {
	m := dd2189Model()
	blocks := m.backlogListBlocks(m.backlog, 50, true)
	blk := blocks[0] // non-cursor → einheitlicher 1-Spalten-Cursor-Pad

	if len(blk) < 2 {
		t.Fatalf("Block braucht Header + ≥1 Titel-Zeile, got %d", len(blk))
	}
	header := ansi.Strip(blk[0])
	title1 := ansi.Strip(blk[1])

	// Header trägt den Key, NICHT den Titel.
	if !strings.Contains(header, "DD2-1") {
		t.Errorf("Header ohne Key: %q", header)
	}
	if strings.Contains(header, "Ein Titel") {
		t.Errorf("Titel darf NICHT in der Header-Zeile stehen: %q", header)
	}

	// Hängeeinzug: Titel-Text beginnt exakt in der Key-Spalte (Displaybreite, nicht
	// Byte-Index — der Marker ⯁ ist mehrere Bytes, aber 1 Spalte).
	keyCol := lipgloss.Width(header[:strings.Index(header, "DD2-1")])
	titleCol := len(title1) - len(strings.TrimLeft(title1, " "))
	if keyCol != titleCol {
		t.Errorf("Titel hängt nicht unter dem Key: keyCol=%d titleCol=%d\nHDR:%q\nTTL:%q", keyCol, titleCol, header, title1)
	}
}
