package tui

// DD2-77: Issue-Feld-Edit. enter auf einem fokussierten Feld öffnet eine huh-
// Single-Field-Form (Input/Text/Select), Submit → UpdateIssue, Cache in-place
// gemerged (Kern-Spalten, Joins erhalten), esc bricht ab, Fehler → errNote rot.

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// Die Übersicht-Section (Kopf, Fokus-Index 0) macht title/type/priority editierbar
// (DD2-77 MUSS). Editor je Feld: title=input, type/priority=select.
func TestKopfSectionEditable(t *testing.T) {
	secs := detailFocusModel().focusSections()
	if len(secs) < 3 {
		t.Fatalf("erwartet Übersicht + 2 Content-Sektionen, got %d", len(secs))
	}
	if secs[0].title != "Overview" {
		t.Fatalf("Fokus-Section 0 = %q, want Übersicht", secs[0].title)
	}
	want := map[string]string{"title": "input", "type": "select", "priority": "select"}
	if len(secs[0].fields) != 3 {
		t.Fatalf("Übersicht-Felder=%d, want 3", len(secs[0].fields))
	}
	for _, f := range secs[0].fields {
		if want[f.key] != f.editor {
			t.Errorf("Feld %q editor=%q, want %q", f.key, f.editor, want[f.key])
		}
	}
	// Content-Section 1 trägt weiterhin die Textfelder (goal/description/po_notes).
	if secs[1].fields[0].key != "goal" {
		t.Errorf("Content-Section 1 erstes Feld=%q, want goal", secs[1].fields[0].key)
	}
}

// enter auf Section-Ebene steigt ins Feld (kein Form); enter auf Feld-Ebene öffnet
// die editField-Form für das aktive Feld (D04).
func TestDetailFieldEnterOpensEditForm(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // → Übersicht, Section-Ebene
	m = mi.(model)
	mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Section → Feld-Ebene
	m = mi.(model)
	if m.detailLevel != 1 || m.form != nil {
		t.Fatalf("enter auf Section → level=%d form=%v, want 1/false", m.detailLevel, m.form != nil)
	}
	mi, _ = m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Feld → Form
	m = mi.(model)
	if m.form == nil || m.formKind != "editField" {
		t.Fatalf("enter auf Feld → form=%v kind=%q, want true/editField", m.form != nil, m.formKind)
	}
	if m.editField != "title" || m.editEditor != "input" {
		t.Errorf("editField=%q editor=%q, want title/input", m.editField, m.editEditor)
	}
	if m.editValue != "A" {
		t.Errorf("editValue=%q, want A (Preset = aktueller Titel)", m.editValue)
	}
}

// type-Feld → editField-Form mit Select-Editor, vorbelegt mit aktuellem Typ.
func TestDetailFieldEditTypeSelect(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Übersicht
	mi, _ = mi.(model).keyTree(key("l"))               // Feld-Ebene, fieldCursor 0 (title)
	mi, _ = mi.(model).keyTree(key("k"))               // fieldCursor 1 (type)
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.editField != "type" || m.editEditor != "select" {
		t.Errorf("editField=%q editor=%q, want type/select", m.editField, m.editEditor)
	}
	if m.editValue != "bug" {
		t.Errorf("editValue=%q, want bug (aktueller Typ)", m.editValue)
	}
}

// D05: issueUpdatedMsg ersetzt den Cache-Eintrag in-place — Kern-Spalten aus der
// (rohen) Update-Response, Anzeige-Joins (milestone/tags) bleiben erhalten.
func TestIssueUpdatedMsgMergesCachePreservingJoins(t *testing.T) {
	m := treeModel()
	mile, oldGoal := "M1", "alt"
	m.treeIssues[10] = []api.Issue{{
		ID: 55, Key: "DD2-1", Title: "Alt", Type: "bug", Priority: 1, Status: "in_progress",
		Goal: &oldGoal, Milestone: &mile, Tags: []api.Tag{{Name: "x"}},
	}}
	newGoal := "neu"
	// Update-Response = rohe Backlog-Zeile: title/type/priority/goal neu, KEINE Joins.
	upd := &api.Issue{ID: 55, Key: "DD2-1", Title: "Neu", Type: "feature", Priority: 2, Goal: &newGoal}

	mi, _ := m.Update(issueUpdatedMsg{issue: upd})
	got := mi.(model).treeIssues[10][0]

	if got.Title != "Neu" || got.Type != "feature" || got.Priority != 2 || deref(got.Goal) != "neu" {
		t.Errorf("Kern-Spalten nicht gemerged: title=%q type=%q prio=%d goal=%q",
			got.Title, got.Type, got.Priority, deref(got.Goal))
	}
	if got.Milestone == nil || *got.Milestone != "M1" {
		t.Errorf("Join Milestone verloren: %v", got.Milestone)
	}
	if len(got.Tags) != 1 {
		t.Errorf("Join Tags verloren: %v", got.Tags)
	}
	if mi.(model).errNote != "" {
		t.Errorf("errNote nach Erfolg gesetzt: %q", mi.(model).errNote)
	}
}

// issueUpdatedMsg im treeFilterIssues-Cache (projektweiter Filter) ebenfalls gemerged.
func TestIssueUpdatedMsgMergesFilterCache(t *testing.T) {
	m := treeModel()
	sid := 10
	m.treeFilterIssues = []api.Issue{{ID: 7, Key: "DD2-2", Title: "Alt", Type: "bug", Status: "planned", AssignedSprint: &sid}}
	m.treeIssuesLoaded = true
	upd := &api.Issue{ID: 7, Key: "DD2-2", Title: "Neu", Type: "bug", Priority: 3}
	mi, _ := m.Update(issueUpdatedMsg{issue: upd})
	if got := mi.(model).treeFilterIssues[0]; got.Title != "Neu" || got.Priority != 3 {
		t.Errorf("Filter-Cache nicht gemerged: %+v", got)
	}
}

// D05: Update-Fehler → errNote rot (kein Cache-Schreiben).
func TestIssueUpdatedMsgErrorSetsErrNote(t *testing.T) {
	mi, _ := treeModel().Update(issueUpdatedMsg{err: "must not be empty"})
	if got := mi.(model).errNote; got != "must not be empty" {
		t.Errorf("errNote=%q, want Fehlertext", got)
	}
}

// mergeIssueCore überträgt nur Kern-Spalten und lässt Join-/Review-Felder unberührt.
func TestMergeIssueCore(t *testing.T) {
	mile := "M1"
	rs := "passed"
	dst := &api.Issue{ID: 1, Title: "Alt", Type: "bug", Priority: 1, Milestone: &mile, ReviewStatus: &rs,
		UserStories: []api.UserStory{{Title: "US"}}}
	ctx := "ctx"
	src := &api.Issue{ID: 1, Title: "Neu", Type: "core", Priority: 4, ContextNotes: &ctx}
	mergeIssueCore(dst, src)
	if dst.Title != "Neu" || dst.Type != "core" || dst.Priority != 4 || deref(dst.ContextNotes) != "ctx" {
		t.Errorf("Kern nicht übernommen: %+v", dst)
	}
	if dst.Milestone == nil || deref(dst.ReviewStatus) != "passed" || len(dst.UserStories) != 1 {
		t.Errorf("Join/Review-Felder fälschlich überschrieben: %+v", dst)
	}
}

// currentFieldValue liefert den Preset je Contract-Feld (Strings + Priority als Zahl-String).
func TestCurrentFieldValue(t *testing.T) {
	g := "Target"
	it := api.Issue{Title: "T", Type: "bug", Priority: 3, Goal: &g}
	cases := map[string]string{"title": "T", "type": "bug", "priority": "3", "goal": "Target", "po_notes": ""}
	for k, want := range cases {
		if got := currentFieldValue(it, k); got != want {
			t.Errorf("currentFieldValue(%q)=%q, want %q", k, got, want)
		}
	}
}

// esc auf der editField-Form bricht ab (kein Schreiben), Detail-Fokus bleibt.
func TestEditFormEscCancels(t *testing.T) {
	m := detailFocusModel()
	mi, _ := m.keyTree(tea.KeyMsg{Type: tea.KeyEnter}) // Übersicht
	mi, _ = mi.(model).keyTree(key("l"))               // Feld-Ebene
	mi, _ = mi.(model).keyTree(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if m.form == nil {
		t.Fatal("Form sollte offen sein")
	}
	mi, _ = m.Update(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.form != nil {
		t.Error("esc sollte die Form schließen")
	}
	if !m.detailFocus {
		t.Error("Detail-Fokus sollte nach Abbruch erhalten bleiben")
	}
}

// editField-Editoren je Feldtyp: input/text/select.
func TestBuildEditFieldFormByEditor(t *testing.T) {
	for _, f := range []detailField{
		{key: "title", label: "Title", editor: "input"},
		{key: "goal", label: "Goal", editor: "text"},
		{key: "type", label: "Type", editor: "select"},
		{key: "priority", label: "Priority", editor: "select"},
	} {
		if form := buildEditFieldForm(f, "x"); form == nil {
			t.Errorf("buildEditFieldForm(%q) = nil", f.key)
		}
	}
}
