package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

func TestResultMark(t *testing.T) {
	full := "ergebnis da"
	if got := resultMark(api.Issue{Result: &full}); got != "✓" {
		t.Errorf("resultMark(mit result)=%q, want ✓", got)
	}
	if got := resultMark(api.Issue{}); got != "✗" {
		t.Errorf("resultMark(ohne result)=%q, want ✗", got)
	}
	blank := "   "
	if got := resultMark(api.Issue{Result: &blank}); got != "✗" {
		t.Errorf("resultMark(whitespace)=%q, want ✗ (leeres result zählt nicht)", got)
	}
}

func TestSprintClipHasErgebnisseColumn(t *testing.T) {
	res := "fertig"
	s := &api.Sprint{Key: "DD2#1", Name: "S", Items: []api.Issue{
		{ID: 1, Key: "DD2-1", Title: "A", Result: &res},
		{ID: 2, Key: "DD2-2", Title: "B"},
	}}
	out := sprintClip(s)
	if !strings.Contains(out, "Results") {
		t.Error("sprintClip ohne Ergebnisse-Spalte (I03)")
	}
	if !strings.Contains(out, "✓") || !strings.Contains(out, "✗") {
		t.Error("sprintClip soll ✓/✗ je nach result tragen")
	}
}

func TestCockpitEscReloadsTree(t *testing.T) {
	// DD2-111: der direkte (Nicht-Liste-)Cockpit-Rückweg führt jetzt zum Tree-Primat
	// (Ranger gesunset), nicht mehr zu viewColumns. Reload bleibt (B01).
	m := reviewModel()
	m.reviewReturn = viewTree
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewTree {
		t.Errorf("q → view=%d, want viewTree", m.view)
	}
	if cmd == nil {
		t.Error("B01: q sollte die Daten (loadMilestones) neu laden")
	}
}
