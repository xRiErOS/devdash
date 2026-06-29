package tui

// DD2-135 (Review-Befund #3): Section 1 (Goal/PO-Notes) immer vorhanden, goal +
// po_notes auch leer editierbar — der PO kann PO-Notes nachtragen.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// Ein feldloses Issue (kein goal/desc/po/bg) hat trotzdem Section 1 mit goal +
// po_notes als editierbare Felder.
func TestSection1AlwaysPresent(t *testing.T) {
	it := api.Issue{Key: "DD2-9", Title: "Leer", Type: "bug", Priority: 1, Status: "new"}
	secs := (model{}).issueSections(it, 60, false)
	if len(secs) == 0 || secs[0].title != "Goal / Description ∙ PO notes" {
		t.Fatalf("Section 1 fehlt bei feldlosem Issue: %+v", secs)
	}
	keys := make([]string, len(secs[0].fields))
	for i, f := range secs[0].fields {
		keys[i] = f.key
	}
	got := strings.Join(keys, ",")
	if got != "goal,po_notes" {
		t.Errorf("Section-1-Felder=%q, want goal,po_notes (description nur wenn gesetzt)", got)
	}
}

// description bleibt navigierbar, wenn vorhanden (Legacy-Edit), aber wird leer NICHT
// als Feld geführt.
func TestSection1DescriptionOnlyWhenSet(t *testing.T) {
	d := "alt"
	it := api.Issue{Key: "DD2-9", Title: "T", Type: "bug", Priority: 1, Description: &d}
	secs := (model{}).issueSections(it, 60, false)
	keys := make([]string, len(secs[0].fields))
	for i, f := range secs[0].fields {
		keys[i] = f.key
	}
	if strings.Join(keys, ",") != "goal,description,po_notes" {
		t.Errorf("mit description → %v, want goal,description,po_notes", keys)
	}
}

// PO kann leeres po_notes im Backlog-Detail editieren: Section 1 fokussieren → das
// po_notes-Feld öffnet die editField-Form (auch wenn der Wert leer ist).
func TestBacklogEditEmptyPoNotes(t *testing.T) {
	m := model{
		view:    viewBrowseBacklog,
		backlog: []api.Issue{{ID: 5, Key: "DD2-5", Title: "Ohne Notes", Type: "bug", Priority: 1, Status: "new"}},
		blist:   listState{length: 1, cursor: 0},
		accOpen: 1,
	}
	mi, _ := m.keyBacklog(key("l"))         // Detail-Fokus (Übersicht, sec 0)
	mi, _ = mi.(model).keyBacklog(key("k")) // → Section 1
	mi, _ = mi.(model).keyBacklog(key("l")) // Feld-Ebene
	mfocus := mi.(model)
	// auf po_notes navigieren (Feld 1: goal=0, po_notes=1)
	mi, _ = mfocus.keyBacklog(key("k"))
	mi, _ = mi.(model).keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.formKind != "editField" || m.editField != "po_notes" {
		t.Errorf("editField=%q kind=%q, want po_notes/editField", m.editField, m.formKind)
	}
}
