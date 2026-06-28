package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

// DD2-147: Sobald po_notes/goal im Issue vorhanden sind (Fix lädt sie via
// fields=full), rendert der geteilte Detail-Code (issueSections, von Backlog- UND
// Tree-Detail genutzt) sie statt "(empty)". Die bisherigen Fixtures hatten kein
// po_notes gesetzt → die Lücke blieb unentdeckt.
func TestIssueSectionsShowsPoNotesAndGoal(t *testing.T) {
	m := columnsModel()
	po := "Bitte zuerst Auth fixen"
	goal := "Login funktioniert end-to-end"
	it := api.Issue{Key: "DD2-1", Title: "X", Goal: &goal, PoNotes: &po}

	secs := m.issueSections(it, 80)
	if len(secs) == 0 {
		t.Fatal("issueSections lieferte keine Sektionen")
	}
	var joined strings.Builder
	for _, s := range secs {
		joined.WriteString(ansi.Strip(s.body) + "\n")
	}
	out := joined.String()
	if !strings.Contains(out, po) {
		t.Errorf("po_notes nicht im Detail gerendert:\n%s", out)
	}
	if !strings.Contains(out, goal) {
		t.Errorf("goal nicht im Detail gerendert:\n%s", out)
	}
	if strings.Contains(out, "(empty)") {
		t.Errorf("Detail zeigt trotz gesetzter Werte noch '(empty)':\n%s", out)
	}
}
