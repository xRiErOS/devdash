package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-29: openIssueStatus aktiviert das Status-Menü view-übergreifend und merkt
// sich Ziel-Issue + Sprint-Kontext.
func TestOpenIssueStatusSetsMenu(t *testing.T) {
	m := model{}
	it := &api.Issue{ID: 7, Status: "planned"}
	nm, _ := m.openIssueStatus(it, 99)
	mm := nm.(model)
	if !mm.statusPick {
		t.Fatal("statusPick nicht aktiv")
	}
	if mm.stIssueID != 7 {
		t.Errorf("stIssueID=%d, want 7", mm.stIssueID)
	}
	if mm.stIssueStatus != "planned" {
		t.Errorf("stIssueStatus=%q, want planned", mm.stIssueStatus)
	}
	if mm.stSprintID != 99 {
		t.Errorf("stSprintID=%d, want 99", mm.stSprintID)
	}
	// planned → allowedManualStatuses Schnitt = {refined, in_progress}
	if len(mm.sopts) == 0 {
		t.Error("keine Status-Optionen gesetzt")
	}
	for _, s := range mm.sopts {
		if s == "passed" || s == "done" || s == "rejected" {
			t.Errorf("unerlaubtes Ziel %q im Menü (muss über Review laufen)", s)
		}
	}
}

// nil-Issue darf kein Menü öffnen.
func TestOpenIssueStatusNilNoMenu(t *testing.T) {
	m := model{}
	nm, _ := m.openIssueStatus(nil, 0)
	if nm.(model).statusPick {
		t.Error("statusPick darf bei nil-Issue nicht aktiv sein")
	}
}
