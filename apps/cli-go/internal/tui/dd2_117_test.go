package tui

// DD2-117: Review-Detail-Pane zeigt Kontext-Meta (Milestone/Sprint/Tags), damit der
// PO das Issue beim Review einordnen kann. Leere Werte erscheinen nicht.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

func TestReviewDetailShowsContextMeta(t *testing.T) {
	ms, sp := "M2 Qualität", "DD2#29"
	it := &api.Issue{
		Key: "DD2-1", Title: "T", Type: "bug", Priority: 1, Status: "to_review",
		Milestone: &ms, SprintKey: &sp,
		Tags: []api.Tag{{ID: 1, Name: "backend", Color: "blue"}},
	}
	out := ansi.Strip((model{}).reviewDetailPane(it, 80, 20))
	for _, want := range []string{"M2 Qualität", "DD2#29", "backend"} {
		if !strings.Contains(out, want) {
			t.Errorf("Review-Detail ohne %q:\n%s", want, out)
		}
	}
}

func TestReviewDetailNoMetaLineWhenEmpty(t *testing.T) {
	it := &api.Issue{Key: "DD2-2", Title: "Leer", Type: "bug", Priority: 1, Status: "to_review"}
	out := ansi.Strip((model{}).reviewDetailPane(it, 80, 20))
	if strings.Contains(out, "milestone") || strings.Contains(out, "sprint") {
		t.Errorf("leeres Issue zeigt Meta-Label:\n%s", out)
	}
}
