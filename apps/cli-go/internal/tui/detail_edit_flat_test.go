package tui

// DD2-79: Feld-Edit für Meilenstein/Sprint über dieselbe editField-Form wie das
// Issue. enter/l auf einem flachen Feld öffnet die vorbelegte Form (Entity-Dispatch
// in formCreateCmd); die Update-Response merged in-place in die milestones-Slice (D05).

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// enter auf einem fokussierten Meilenstein-Feld öffnet die editField-Form, vorbelegt
// mit dem aktuellen Wert; der Edit-State trägt entity=milestone.
func TestFlatEditOpensFormMilestone(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 0                                           // Meilenstein M1
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter})         // → Detail-Fokus, Feld 0 (name)
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // → editField-Form
	mm := mi.(model)
	if mm.form == nil || mm.formKind != "editField" {
		t.Fatalf("enter auf Feld → form=%v formKind=%q, want gesetzt/editField", mm.form != nil, mm.formKind)
	}
	if mm.editEntity != "milestone" || mm.editField != "name" {
		t.Errorf("editEntity=%q editField=%q, want milestone/name", mm.editEntity, mm.editField)
	}
	if mm.editValue != "M1" {
		t.Errorf("editValue=%q, want M1 (Preset)", mm.editValue)
	}
}

// l/→ auf einem Sprint-Feld (goal) öffnet die Form mit entity=sprint.
func TestFlatEditOpensFormSprint(t *testing.T) {
	m := detailFocusModel()
	m.treeCursor = 1                                   // Sprint s10 (S1)
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Detail-Fokus, Feld 0
	mi, _ = mi.(model).keyTree(key("k"))               // Feld 1 = goal
	mi, _ = mi.(model).keyTree(key("l"))               // l/→ editiert das Feld
	mm := mi.(model)
	if mm.form == nil || mm.editEntity != "sprint" || mm.editField != "goal" {
		t.Fatalf("l auf goal → entity=%q field=%q form=%v, want sprint/goal/gesetzt", mm.editEntity, mm.editField, mm.form != nil)
	}
}

// milestoneUpdatedMsg merged die Kern-Spalten in-place in die milestones-Slice (D05).
func TestMilestoneUpdateMergesCache(t *testing.T) {
	m := treeModel() // M1 (id1)
	nd, td := "Neuer Name", "2026-09-01"
	upd := &api.Milestone{ID: 1, Name: nd, TargetDate: &td}
	mi, _ := m.Update(milestoneUpdatedMsg{ms: upd})
	mm := mi.(model)
	if mm.milestones[0].Name != nd {
		t.Errorf("Name=%q, want %q (in-place gemerged)", mm.milestones[0].Name, nd)
	}
	if deref(mm.milestones[0].TargetDate) != td {
		t.Errorf("TargetDate=%q, want %q", deref(mm.milestones[0].TargetDate), td)
	}
	// Sprints (Anzeige-Join) bleiben unberührt.
	if len(mm.milestones[0].Sprints) != 2 {
		t.Errorf("Sprints=%d, want 2 (unberührt)", len(mm.milestones[0].Sprints))
	}
	if mm.errNote != "" {
		t.Errorf("errNote=%q, want leer", mm.errNote)
	}
}

// sprintUpdatedMsg merged name/goal in milestones[*].Sprints UND curSprint (D05).
func TestSprintUpdateMergesCache(t *testing.T) {
	m := treeModel() // Sprint id10 "S1"
	cur := api.Sprint{ID: 10, Key: "DD2#1", Name: "S1"}
	m.curSprint = &cur
	g := "Neues Ziel"
	upd := &api.Sprint{ID: 10, Name: "S1 neu", Goal: &g}
	mi, _ := m.Update(sprintUpdatedMsg{sp: upd})
	mm := mi.(model)
	if mm.milestones[0].Sprints[0].Name != "S1 neu" {
		t.Errorf("Sprint.Name=%q, want 'S1 neu'", mm.milestones[0].Sprints[0].Name)
	}
	if deref(mm.milestones[0].Sprints[0].Goal) != g {
		t.Errorf("Sprint.Goal=%q, want %q", deref(mm.milestones[0].Sprints[0].Goal), g)
	}
	if mm.curSprint == nil || mm.curSprint.Name != "S1 neu" || deref(mm.curSprint.Goal) != g {
		t.Errorf("curSprint nicht gemerged: %+v", mm.curSprint)
	}
}

// Fehler-Response setzt errNote (rot, D05), kein Cache-Merge.
func TestEntityUpdateError(t *testing.T) {
	m := treeModel()
	mi, _ := m.Update(milestoneUpdatedMsg{err: "name darf nicht leer sein"})
	if mi.(model).errNote != "name darf nicht leer sein" {
		t.Errorf("errNote=%q, want Fehlertext", mi.(model).errNote)
	}
	ms, _ := treeModel().Update(sprintUpdatedMsg{err: "boom"})
	if ms.(model).errNote != "boom" {
		t.Errorf("Sprint errNote=%q, want boom", ms.(model).errNote)
	}
}
