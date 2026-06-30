package tui

// DD2-138: Backlog-Detail-Navigation MIT geladenen Milestones — focusedNode darf im
// Backlog NICHT den ersten Tree-Meilenstein liefern (sonst Flat-Handler-Fehlrouting).
// Die DD2-74-Tests waren falsch-positiv, weil sie keine Milestones luden.

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func TestBacklogDetailNavWithMilestonesLoaded(t *testing.T) {
	g, po := "Target", "PO-Text"
	m := model{
		view:       viewBrowseBacklog,
		milestones: []api.Milestone{{ID: 1, Name: "M1", Status: "in_progress"}}, // triggert focusedNode-Bug
		backlog: []api.Issue{
			{ID: 1, Key: "DD2-1", Title: "A", Type: "bug", Priority: 1, Status: "new", Goal: &g, PoNotes: &po},
		},
		blist:   listState{length: 1, cursor: 0},
		accOpen: 1,
	}

	// focusedNode muss im Backlog nil sein (kein Baum-Knoten).
	if m.focusedNode() != nil {
		t.Fatal("focusedNode im Backlog muss nil sein (DD2-138)")
	}

	// enter → Issue-Pfad (Übersicht, zweistufig).
	mi, _ := m.keyBacklog(key("enter"))
	m = mi.(model)
	if !m.detailFocus || m.detailLevel != 0 || m.secCursor != 0 {
		t.Fatalf("enter → Issue-Übersicht erwartet: focus=%v level=%d sec=%d", m.detailFocus, m.detailLevel, m.secCursor)
	}

	// Ziffer 1 → Section 1 (Goal/PO-Notes).
	mi, _ = m.keyBacklog(key("1"))
	m = mi.(model)
	if m.secCursor != 1 {
		t.Fatalf("Ziffer 1 → sec=%d, want 1", m.secCursor)
	}

	// l → Feld-Ebene; k → po_notes (Felder: goal, po_notes); enter → editField po_notes.
	mi, _ = m.keyBacklog(key("l"))
	mi, _ = mi.(model).keyBacklog(key("k"))
	mi, _ = mi.(model).keyBacklog(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.formKind != "editField" || m.editField != "po_notes" {
		t.Errorf("editField=%q kind=%q, want po_notes/editField (Nav erreicht po_notes)", m.editField, m.formKind)
	}
}
