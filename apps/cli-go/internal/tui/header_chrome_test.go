package tui

// DD2-48/23: gemeinsame Screen-Chrome — Projekt-Präfix im Titel + Info-Grid in
// fester Reihenfolge über alle Detail-Views. Sichert die PO-Forderung „jedes View
// zeigt konsistent das Projekt-Präfix" und „gleiche Information an gleicher Stelle".

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

func TestScreenTitlePrefix(t *testing.T) {
	m := model{project: &api.Project{Prefix: "DD2", Slug: "devd2"}}
	if got := m.screenTitle("Issue DD2-99"); got != "dd2 — Issue DD2-99" {
		t.Errorf("Präfix-Titel falsch: got %q", got)
	}
	if got := (model{}).screenTitle("Backlog"); got != "dd — Backlog" {
		t.Errorf("Fallback ohne Projekt: got %q", got)
	}
}

func TestMetaGridOrderAndDropsEmpty(t *testing.T) {
	out := ansi.Strip(metaGrid([]hslot{
		{"Status", "passed"}, {"Milestone", ""}, {"Progress", "2/3"},
	}, 200))
	if strings.Contains(out, "Milestone") {
		t.Errorf("leerer Slot nicht entfernt: %q", out)
	}
	si, fi := strings.Index(out, "Status"), strings.Index(out, "Progress")
	if si < 0 || fi < 0 || si > fi {
		t.Errorf("Slot-Reihenfolge falsch (Status vor Fortschritt): %q", out)
	}
}

// Memory-Browser ist eigenständig (Zwei-Pane), trägt aber denselben Präfix-Titel.
func TestMemoryBrowserHasPrefixTitle(t *testing.T) {
	m := model{project: &api.Project{Prefix: "DD2", Slug: "devd2"}, width: 100, height: 30}
	out := ansi.Strip(m.viewMemory())
	if !strings.Contains(out, "dd2 — Memory-Browser") {
		t.Errorf("Memory-Browser ohne Präfix-Titel:\n%s", out)
	}
}
