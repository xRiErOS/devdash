package tui

import (
	"strings"
	"testing"
)

func TestSplitCSV(t *testing.T) {
	got := splitCSV("a, b ,,c")
	if len(got) != 3 || got[0] != "a" || got[1] != "b" || got[2] != "c" {
		t.Errorf("splitCSV = %+v, want [a b c]", got)
	}
	if splitCSV("   ") != nil {
		t.Error("splitCSV(whitespace) sollte nil sein")
	}
}

func TestBuildResultYAML(t *testing.T) {
	out := buildResultYAML("fertig", "fix", []string{"abc fix x"}, "so gemacht", "DD2-3")
	for _, want := range []string{
		"outcome_summary: fertig",
		"outcome_type: fix",
		"- abc fix x",
		"related_issues:",
		"- DD2-3",
		"## Approach",
		"so gemacht",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("buildResultYAML fehlt %q in:\n%s", want, out)
		}
	}
	// Default-outcome_type, wenn leer
	if !strings.Contains(buildResultYAML("x", "", nil, "", ""), "outcome_type: feat") {
		t.Error("leerer outcome_type sollte auf feat defaulten")
	}
}

func TestCockpitROpensResultForm(t *testing.T) {
	m := reviewModel()
	mi, _ := m.Update(keyMsg("r"))
	m = mi.(model)
	if m.form == nil || m.formKind != "result" {
		t.Fatalf("r öffnet kein result-Formular (kind=%q)", m.formKind)
	}
	if m.resultIssueID != 100 || m.resultIssueKey != "SPF-1" || m.resultSprintID != 10 {
		t.Errorf("result-Ziel falsch: id=%d key=%q sprint=%d", m.resultIssueID, m.resultIssueKey, m.resultSprintID)
	}
}
