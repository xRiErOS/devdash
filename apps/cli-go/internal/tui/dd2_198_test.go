package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

// DD2-198: Der Such-Detail-Pane rendert identisch zum Project-Browser-Issue-Detail
// (detailTitle + metaStrip + ziffern-Accordion) — NICHT mehr das alte Flat-Layout
// ("milestone: …" / "Goal:" / "Background:").
func TestDD2198SearchDetailMatchesBrowserLayout(t *testing.T) {
	g, bg := "Erreiche X", "Hintergrund Y"
	ms := "M2"
	m := columnsModel()
	m.treeFilterIssues = []api.Issue{
		{Key: "DD2-1", Title: "Login bug", Type: "bug", Priority: 2, Status: "in_progress",
			Milestone: &ms, Goal: &g, Background: &bg},
	}
	m.treeIssuesLoaded = true
	m.searchList.setLen(1)
	m.searchList.cursor = 0

	out := ansi.Strip(strings.Join(m.searchDetailRows(m.searchResults(), 80), "\n"))

	// Browser-Detail-Marker (metaStrip-Labels + Accordion-Sektion).
	for _, want := range []string{"DD2-1", "Login bug", "prio", "type", "Sections: digit", "[1]"} {
		if !strings.Contains(out, want) {
			t.Errorf("Such-Detail ohne Browser-Marker %q:\n%s", want, out)
		}
	}
	// Altes Flat-Layout darf NICHT mehr auftauchen.
	for _, gone := range []string{"milestone: ", "Goal:", "Background:"} {
		if strings.Contains(out, gone) {
			t.Errorf("altes Flat-Layout-Fragment %q noch vorhanden:\n%s", gone, out)
		}
	}
}
