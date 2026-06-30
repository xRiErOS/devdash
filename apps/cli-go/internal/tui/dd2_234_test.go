package tui

// DD2-233/234: ctrl+e im Create-Issue-Form bearbeitet po_notes im konfigurierten
// Editor (nicht $EDITOR) und der Rückkehr-Inhalt landet AUSSCHLIESSLICH in
// po_notes — nicht zusätzlich in user_stories. Ursache des Bleeds war huh's
// eingebauter Editor: sein updateValueMsg-Ergebnis wird an ALLE Text-Felder der
// Gruppe broadcastet (huh group.go). Fix: huh-Editor auf den Text-Feldern aus,
// ctrl+e selbst abfangen, nur po_notes gezielt reseeden.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// ctrl+e auf dem offenen Create-Issue-Form liefert den Editor-Suspend-Cmd
// (über editInEditor → configuredEditor, DD2-233).
func TestCreateFormCtrlEReturnsEditorCmd(t *testing.T) {
	m := treeModel()
	mi, _ := m.openForm("issue")
	m = mi.(model)
	if m.formKind != "issue" || m.form == nil {
		t.Fatalf("Setup: Create-Issue-Form nicht offen (kind=%q)", m.formKind)
	}
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyCtrlE})
	if cmd == nil {
		t.Fatal("ctrl+e im Create-Issue-Form sollte den Editor-Cmd liefern")
	}
}

// editorFinishedMsg ins offene Create-Issue-Form reseedet NUR po_notes — der
// Inhalt erscheint genau einmal (kein Bleed in user_stories).
func TestCreateFormEditorReseedNoBleed(t *testing.T) {
	m := treeModel()
	mi, _ := m.openForm("issue")
	m = mi.(model)
	mi, _ = m.Update(editorFinishedMsg{content: "EDITORPONOTE", changed: true})
	m = mi.(model)
	if m.form == nil || m.formKind != "issue" {
		t.Fatalf("Form sollte nach Editor-Rückkehr offen + issue bleiben (kind=%q)", m.formKind)
	}
	v := m.form.View()
	if n := strings.Count(v, "EDITORPONOTE"); n != 1 {
		t.Errorf("Editor-Inhalt erscheint %d× im View, want genau 1 (Bleed in user_stories?):\n%s", n, v)
	}
}

// Strukturgarantie: po_notes und user_stories sind unabhängige Felder — ein
// po_notes-Preset blutet nicht in user_stories.
func TestIssueFormFieldsIndependent(t *testing.T) {
	var f tea.Model = buildIssueForm([]api.Tag{}, issueDraft{poNotes: "ONLYPO", userStories: "ONLYSTORY"})
	_ = f.Init()
	v := f.View()
	if strings.Count(v, "ONLYPO") != 1 {
		t.Errorf("po_notes-Wert nicht genau 1× (Bleed?):\n%s", v)
	}
	if strings.Count(v, "ONLYSTORY") != 1 {
		t.Errorf("user_stories-Wert nicht genau 1×:\n%s", v)
	}
}

// changed=false lässt das Create-Form unangetastet (kein Reseed).
func TestCreateFormEditorNoChangeKeepsForm(t *testing.T) {
	m := treeModel()
	mi, _ := m.openForm("issue")
	m = mi.(model)
	mi, _ = m.Update(editorFinishedMsg{content: "ignored", changed: false})
	m = mi.(model)
	if m.form == nil || m.formKind != "issue" {
		t.Fatal("Form sollte offen bleiben")
	}
	if strings.Contains(m.form.View(), "ignored") {
		t.Error("unveränderter Editor-Lauf sollte den Inhalt NICHT übernehmen")
	}
}
