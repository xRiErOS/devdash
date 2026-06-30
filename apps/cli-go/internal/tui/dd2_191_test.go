package tui

// DD2-191: Tree-Status-Coverage nach Columns-Sunset. Deckt treeStatusVisible
// (per-kind Default vs. explizite Whitelist) und das Status-Rendering der Tree-
// Knoten (statusDot beim Meilenstein, statusText beim Sprint) ab.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/muesli/termenv"
)

// treeStatusVisible: ohne explizite Whitelist greift der per-kind Default
// (completed/cancelled versteckt, offene sichtbar); je Art separat.
func TestDD2191TreeStatusVisibleDefaults(t *testing.T) {
	m := browseModel()
	cases := []struct {
		kind   treeKind
		status string
		want   bool
	}{
		{tkMile, "in_progress", true},
		{tkMile, "completed", false},
		{tkSprint, "new", true},
		{tkSprint, "cancelled", false},
		{tkIssue, "to_review", true},
		{tkIssue, "completed", false},
		{tkIssue, "cancelled", false},
	}
	for _, c := range cases {
		if got := m.treeStatusVisible(c.kind, c.status); got != c.want {
			t.Errorf("treeStatusVisible(%v,%q)=%v, want %v", c.kind, c.status, got, c.want)
		}
	}
}

// Eine explizite fStatus-Whitelist sticht den per-kind Default — dann zählt nur,
// ob der Status in der Whitelist steht (auch für sonst versteckte Stati).
func TestDD2191TreeStatusVisibleWhitelist(t *testing.T) {
	m := browseModel()
	m.fStatus = map[string]bool{"completed": true}
	if !m.treeStatusVisible(tkIssue, "completed") {
		t.Error("Whitelist 'completed' soll completed sichtbar machen")
	}
	if m.treeStatusVisible(tkIssue, "to_review") {
		t.Error("Whitelist {completed} soll to_review verstecken (nicht gelistet)")
	}
}

// treeNodes blendet einen completed Meilenstein per Default aus.
func TestDD2191TreeNodesHidesCompletedMilestone(t *testing.T) {
	m := browseModel()
	m.milestones = []api.Milestone{
		{ID: 1, Name: "Offen", Status: "in_progress"},
		{ID: 2, Name: "Fertig", Status: "completed"},
	}
	var names []string
	for _, n := range m.treeNodes() {
		if n.kind == tkMile {
			names = append(names, m.milestones[n.mileIdx].Name)
		}
	}
	joined := strings.Join(names, ",")
	if !strings.Contains(joined, "Offen") || strings.Contains(joined, "Fertig") {
		t.Errorf("treeNodes Meilensteine=%q, want nur 'Offen' (completed versteckt)", joined)
	}
}

// Tree-Status-Rendering: Meilenstein-Zeile trägt den farbigen statusDot, die
// Sprint-Zeile den statusText.
func TestDD2191TreeRowStatusRendering(t *testing.T) {
	lipgloss.SetColorProfile(termenv.TrueColor)
	defer lipgloss.SetColorProfile(termenv.Ascii)

	m := browseModel()
	m.milestones = []api.Milestone{{ID: 1, Name: "M1", Status: "in_progress",
		Sprints: []api.Sprint{{ID: 10, Key: "DD2#9", Name: "S1", Status: "in_progress"}}}}
	m.treeExpMile[1] = true
	m.treeCursor = -1 // kein Cursor → keine Accent-Übermalung
	nodes := m.treeNodes()
	blocks := m.treeLeftBlocks(nodes, 40, true)

	mileLine := ansi.Strip(strings.Join(blocks[0], " "))
	if !strings.Contains(mileLine, statusDot("in_progress")) && !strings.Contains(mileLine, ansi.Strip(statusDot("in_progress"))) {
		t.Errorf("Meilenstein-Zeile ohne statusDot: %q", mileLine)
	}
	// Sprint-Knoten (nach dem Meilenstein) trägt den Status-Text.
	var sprintLine string
	for i, n := range nodes {
		if n.kind == tkSprint {
			sprintLine = ansi.Strip(strings.Join(blocks[i], " "))
		}
	}
	if !strings.Contains(sprintLine, "in_progress") {
		t.Errorf("Sprint-Zeile ohne Status-Text: %q", sprintLine)
	}
}
