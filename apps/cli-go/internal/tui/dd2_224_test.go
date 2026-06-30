package tui

// DD2-224: PO-Notes (und andere Langtext-Felder) im $EDITOR bearbeiten. ctrl+e
// auf einer offenen editField-Form vom Typ "text" suspendiert die TUI in den
// $EDITOR; die Rückkehr spielt den neuen Inhalt als Preset zurück, sodass die PO
// direkt in der Form weiterarbeitet und regulär (enter/alt+enter) speichert.

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

// editFieldUsesEditor gilt nur für Langtext-editFields — nicht für input/select
// und nicht außerhalb des editField-Kinds.
func TestEditFieldUsesEditorPredicate(t *testing.T) {
	cases := []struct {
		kind, editor string
		want         bool
	}{
		{"editField", "text", true},
		{"editField", "input", false},
		{"editField", "select", false},
		{"issue", "text", false}, // Create-Form, kein editField
		{"", "", false},
	}
	for _, c := range cases {
		m := model{formKind: c.kind, editEditor: c.editor}
		if got := m.editFieldUsesEditor(); got != c.want {
			t.Errorf("editFieldUsesEditor(kind=%q editor=%q)=%v, want %v", c.kind, c.editor, got, c.want)
		}
	}
}

// ctrl+e auf einem Langtext-editField liefert den Editor-Suspend-Cmd.
func TestEditorLaunchOnTextEditField(t *testing.T) {
	m := treeModel()
	mi, _ := m.openEditFieldGeneric("issue", 55, detailField{key: "po_notes", label: "PO-Notes", editor: "text"}, "alt")
	m = mi.(model)
	if m.form == nil || m.formKind != "editField" {
		t.Fatalf("Setup: editField-Form nicht offen (kind=%q form=%v)", m.formKind, m.form != nil)
	}
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlE})
	if cmd == nil {
		t.Fatal("ctrl+e auf Langtext-editField sollte den $EDITOR-Cmd liefern")
	}
}

// editorFinishedMsg bei offener editField-Form spielt den neuen Inhalt als Preset
// zurück und hält die Form offen (PO arbeitet weiter, kein direkter Persist).
func TestEditorResultReseedsEditFieldForm(t *testing.T) {
	m := treeModel()
	mi, _ := m.openEditFieldGeneric("issue", 55, detailField{key: "po_notes", label: "PO-Notes", editor: "text"}, "alt")
	m = mi.(model)
	mi, _ = m.Update(editorFinishedMsg{content: "neu aus editor", changed: true})
	m = mi.(model)
	if m.form == nil || m.formKind != "editField" {
		t.Fatalf("Form sollte nach Editor-Rückkehr offen bleiben (kind=%q form=%v)", m.formKind, m.form != nil)
	}
	if m.editValue != "neu aus editor" {
		t.Errorf("editValue=%q nicht aktualisiert", m.editValue)
	}
	// huh memoisiert GetString erst im Run-Loop → die neu gesetzte Vorbelegung
	// (Value-Binding) ist aber bereits in der gerenderten Form sichtbar.
	if v := m.form.View(); !strings.Contains(v, "neu aus editor") {
		t.Errorf("rebuilt Form zeigt den neuen Inhalt nicht:\n%s", v)
	}
}

// changed=false lässt die Form unangetastet (kein Reseed, kein verlorener Tippstand).
func TestEditorResultNoChangeKeepsForm(t *testing.T) {
	m := treeModel()
	mi, _ := m.openEditFieldGeneric("issue", 55, detailField{key: "po_notes", label: "PO-Notes", editor: "text"}, "alt")
	m = mi.(model)
	mi, _ = m.Update(editorFinishedMsg{content: "ignored", changed: false})
	m = mi.(model)
	if m.form == nil {
		t.Fatal("Form sollte offen bleiben")
	}
	if m.editValue != "alt" {
		t.Errorf("editValue=%q, want 'alt' (unverändert)", m.editValue)
	}
	if v := m.form.View(); strings.Contains(v, "ignored") {
		t.Errorf("unveränderter Fall sollte den Editor-Inhalt NICHT übernehmen:\n%s", v)
	}
}
