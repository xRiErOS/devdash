package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// DD2-143: Milestone-Tags müssen in der Columns-Liste (msRows) und am
// TreeView-Knoten erscheinen. Im Test ohne TTY ist das lipgloss-Profil Ascii →
// ANSI gestrippt → der reine Tag-Name steht im String.
func taggedMilestoneModel() model {
	m := newModel(api.NewClient("9"), &api.Project{ID: 9, Slug: "sprout", Prefix: "SPF"}, nil)
	m.milestones = []api.Milestone{
		{ID: 1, Name: "Aktiv", Status: "in_progress", Tags: []api.Tag{
			{ID: 7, Name: "backend", Color: "blue"},
			{ID: 8, Name: "alpha", Color: "green"},
		}},
		{ID: 2, Name: "Ohne", Status: "in_progress"},
	}
	return m
}

func TestMilestoneRowShowsTags(t *testing.T) {
	m := taggedMilestoneModel()
	rows := m.msRows()
	if len(rows) == 0 {
		t.Fatal("msRows leer")
	}
	if !strings.Contains(rows[0], "backend") || !strings.Contains(rows[0], "alpha") {
		t.Errorf("msRows[0] ohne Tags: %q", rows[0])
	}
}

func TestMilestoneRowWithoutTagsHasNoChip(t *testing.T) {
	m := taggedMilestoneModel()
	rows := m.msRows()
	if len(rows) < 2 {
		t.Fatalf("msRows=%d, want 2", len(rows))
	}
	// Zweiter Milestone hat keine Tags → kein Tag-Swatch-Glyph (●).
	if strings.Contains(rows[1], "●") {
		t.Errorf("tag-loser Milestone trägt Swatch: %q", rows[1])
	}
}

func TestTagsInlineEmpty(t *testing.T) {
	if got := tagsInline(nil); got != "" {
		t.Errorf("tagsInline(nil)=%q, want empty", got)
	}
}
