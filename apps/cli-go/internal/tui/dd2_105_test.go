package tui

// DD2-105: Sprint-Review-Handover — aktionsfähiges Markdown-Artefakt aus dem
// Review-Ergebnis (Re-Work inkl. Reject-Kommentar, Passed, Pending, Next-Steps).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

func strp(s string) *string { return &s }

func handoverModel() model {
	goal := "Login works end-to-end"
	res := "implemented"
	return model{curSprint: &api.Sprint{
		Key: "DD2#29", Name: "TUI Features", Goal: &goal, Status: "to_review",
		DoneCount: 1, ItemCount: 3,
		Items: []api.Issue{
			{Key: "DD2-1", Title: "Pass me", Status: "passed", ReviewStatus: strp("passed"), Result: &res},
			{Key: "DD2-2", Title: "Reject me", Status: "rejected", ReviewStatus: strp("not_passed"), ReviewComment: strp("Edge case X fehlt")},
			{Key: "DD2-3", Title: "Open one", Status: "to_review"},
		},
	}}
}

func TestReviewHandoverArtifact(t *testing.T) {
	out := handoverModel().reviewHandoverClip()
	for _, want := range []string{
		"# Sprint Review Handover — DD2#29",
		"Login works end-to-end", // Goal
		"Verdicts: 1 passed · 1 not_passed · 1 open",
		"## Re-Work (not_passed)",
		"DD2-2",
		"Edge case X fehlt", // Reject-Kommentar (DD2-152-Link)
		"## Passed",
		"result attached", // Passed mit Result
		"## Pending review",
		"DD2-3",
		"## Next steps",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("Handover ohne %q:\n%s", want, out)
		}
	}
}

// Alles passed → Next-Steps verweist auf PO-Abschluss.
func TestReviewHandoverAllPassedNextStep(t *testing.T) {
	m := model{curSprint: &api.Sprint{
		Key: "DD2#29", Name: "S", Status: "to_review", ItemCount: 1, DoneCount: 1,
		Items: []api.Issue{{Key: "DD2-1", Title: "X", ReviewStatus: strp("passed")}},
	}}
	out := m.reviewHandoverClip()
	if strings.Contains(out, "## Re-Work") {
		t.Errorf("kein Re-Work-Block erwartet:\n%s", out)
	}
	if !strings.Contains(out, "PO's call") {
		t.Errorf("Next-Step soll PO-Abschluss nennen:\n%s", out)
	}
}
