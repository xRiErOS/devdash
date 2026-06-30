package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// DD2-157: Der Sprint-Complete-Yank (C C) MUSS denselben Markdown kopieren wie
// 'y' (reviewStandClip) — vorher kopierte doSprintComplete das rohe rev-results-
// JSON. Single Source ist reviewStandMarkdown; hier abgesichert, dass die Ausgabe
// Markdown (kein JSON) ist.
func TestReviewStandMarkdownIsMarkdownNotJSON(t *testing.T) {
	s := &api.Sprint{
		Key:  "SPF#1",
		Name: "Demo",
		Items: []api.Issue{
			{Key: "SPF-1", Title: "A", Status: "passed", ReviewStatus: strptr("passed"), Result: strptr("done")},
		},
	}
	out := strings.TrimSpace(reviewStandMarkdown(s))
	if !strings.HasPrefix(out, "# Review SPF#1") {
		t.Errorf("erwartet Markdown-Kopf '# Review SPF#1', got:\n%s", out)
	}
	if strings.HasPrefix(out, "{") || strings.HasPrefix(out, "[") {
		t.Errorf("Ausgabe sieht nach JSON aus statt Markdown:\n%s", out)
	}
	for _, want := range []string{"| Key | Title |", "| SPF-1 |"} {
		if !strings.Contains(out, want) {
			t.Errorf("reviewStandMarkdown fehlt %q\n%s", want, out)
		}
	}
}

// DD2-157: Der 'y'-Wrapper reviewStandClip muss exakt reviewStandMarkdown(curSprint)
// liefern — selbe Single Source wie der C-C-Yank, sonst können beide Pfade driften.
func TestReviewStandClipDelegatesToMarkdown(t *testing.T) {
	m := reviewModel()
	m.curSprint.Items = []api.Issue{
		{Key: "SPF-1", Title: "A", Status: "to_review"},
	}
	if m.reviewStandClip() != reviewStandMarkdown(m.curSprint) {
		t.Error("reviewStandClip weicht von reviewStandMarkdown(curSprint) ab")
	}
}
