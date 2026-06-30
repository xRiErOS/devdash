package tui

// DD2-235: Das Create-Issue-Formular trägt ein Priority-Select (P1–P5), damit der
// PO die Backlog-Priorität direkt beim Anlegen setzt (statt hartkodiert P2).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// Das Formular rendert das Priority-Feld samt der P-Optionen.
func TestCreateIssueFormHasPriorityField(t *testing.T) {
	var f tea.Model = buildIssueForm(nil, issueDraft{})
	_ = f.Init()
	v := f.View()
	if !strings.Contains(v, "Priority") {
		t.Errorf("Create-Issue-Form zeigt kein Priority-Feld:\n%s", v)
	}
	// Default = P3 (Medium) sichtbar (huh rendert die aktive Option).
	if !strings.Contains(v, "P3") {
		t.Errorf("Default-Priorität P3 nicht im View:\n%s", v)
	}
}

// Ein Draft belegt das Priority-Feld vor (überlebt Form-Neuaufbau, DD2-190/234).
func TestCreateIssueFormPriorityPreset(t *testing.T) {
	var f tea.Model = buildIssueForm(nil, issueDraft{priority: "1", title: "Boom"})
	_ = f.Init()
	v := f.View()
	if !strings.Contains(v, "Boom") {
		t.Errorf("Draft-Titel nicht vorbelegt:\n%s", v)
	}
	if !strings.Contains(v, "P1") {
		t.Errorf("Draft-Priorität P1 nicht vorbelegt:\n%s", v)
	}
}

// priorityOptions deckt den vollen Contract-Bereich 1..5 ab (issueUpdateContract).
func TestPriorityOptionsFullRange(t *testing.T) {
	opts := priorityOptions()
	if len(opts) != 5 {
		t.Fatalf("priorityOptions()=%d Optionen, want 5 (P1..P5)", len(opts))
	}
	want := []string{"1", "2", "3", "4", "5"}
	for i, o := range opts {
		if o.Value != want[i] {
			t.Errorf("Option %d Wert=%q, want %q", i, o.Value, want[i])
		}
	}
}

// currentIssueDraft schnappschießt alle Felder des offenen Formulars (Tag-Strings inkl.).
func TestCurrentIssueDraftSnapshot(t *testing.T) {
	m := &model{
		formKind: "issue",
		tags:     []api.Tag{{ID: 7, Name: "x"}},
		form:     buildIssueForm([]api.Tag{{ID: 7, Name: "x"}}, issueDraft{}),
	}
	_ = m.form.Init()
	// GetString liefert pre-run "" (huh memoisiert erst im Run-Loop) — der
	// Snapshot darf trotzdem ohne Panik laufen und ein leeres tagIDs liefern.
	d := m.currentIssueDraft()
	if d.tagIDs == nil {
		// formTagStrings liefert nil bei leerer Auswahl — das ist ok (kein Tag erzwungen).
		d.tagIDs = []string{}
	}
	if len(d.tagIDs) != 0 {
		t.Errorf("ohne Auswahl tagIDs=%v, want leer", d.tagIDs)
	}
}
