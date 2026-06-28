package tui

// DD2-74: Inline-Edit auf dem Backlog-Detail. Reuse der geteilten Fokus-Maschine
// (keyDetailFocus/openEditField) — enter auf einem fokussierten Feld öffnet die
// editField-huh-Form; die Update-Response merged in-place in m.backlog (D04/D05).

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-74: enter auf einem Feld der Content-Section öffnet die editField-Form für das
// richtige Issue/Feld (focusedIssue liefert im Backlog die Listen-Selektion).
func TestBacklogFieldEditOpensForm(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l")) // Detail-Fokus (Übersicht)
	mi, _ = mi.(model).keyBacklog(key("k"))        // → Content-Section 1 (Goal)
	mi, _ = mi.(model).keyBacklog(key("l"))        // → Feld-Ebene
	m := mi.(model)
	if m.detailLevel != 1 {
		t.Fatalf("l/→ auf Content-Section sollte die Feld-Ebene öffnen, level=%d", m.detailLevel)
	}
	mi, _ = m.keyBacklog(tea.KeyMsg{Type: tea.KeyEnter}) // editField öffnen
	m = mi.(model)
	if m.formKind != "editField" {
		t.Errorf("enter auf Feld → formKind=%q, want editField", m.formKind)
	}
	if m.editID != 1 || m.editField != "goal" {
		t.Errorf("editID=%d editField=%q, want 1/goal", m.editID, m.editField)
	}
	if m.form == nil {
		t.Error("editField sollte ein Formular bauen")
	}
}

// DD2-74: Übersicht (secCursor 0) → Feld-Ebene → enter editiert title (Kopf-Feld).
func TestBacklogKopfFieldEdit(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("l")) // Übersicht
	mi, _ = mi.(model).keyBacklog(key("l"))        // Feld-Ebene (Kopf: title/type/priority)
	mi, _ = mi.(model).keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	m := mi.(model)
	if m.editField != "title" {
		t.Errorf("erstes Kopf-Feld editiert → editField=%q, want title", m.editField)
	}
}

// DD2-74/D05: mergeIssueIntoCache patcht den Backlog-Cache in-place (kein Refetch).
func TestBacklogMergeUpdatesCache(t *testing.T) {
	m := backlogFilterModel() // 3 Issues
	ng := "Neues Ziel"
	upd := &api.Issue{ID: 2, Title: "Crash beheben", Type: "bug", Priority: 1, Goal: &ng}
	m.mergeIssueIntoCache(upd)
	var found *api.Issue
	for i := range m.backlog {
		if m.backlog[i].ID == 2 {
			found = &m.backlog[i]
		}
	}
	if found == nil || deref(found.Goal) != "Neues Ziel" {
		t.Errorf("Backlog-Cache nicht aktualisiert: %v", found)
	}
}
