package tui

// DD2-190: n/esc am Anlege-Confirm (DD2-93) verwirft die Issue-Arbeit nicht mehr,
// sondern kehrt ins befüllte Create-Issue-Form zurück. y/enter legt an und räumt
// den gesicherten Draft.

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func openIssueConfirm(t *testing.T) model {
	t.Helper()
	m := treeModel()
	mi, _ := m.openForm("issue")
	m = mi.(model)
	mi2, _ := m.submitForm() // → y/n-Confirm, Draft gesichert
	m = mi2.(model)
	if !m.createConfirm {
		t.Fatal("submitForm sollte das Create-Confirm öffnen")
	}
	if m.createDraft == nil {
		t.Fatal("Issue-Draft wurde nicht gesichert (DD2-190)")
	}
	if m.form != nil {
		t.Fatal("Form sollte während des Confirms geschlossen sein")
	}
	return m
}

// n am Confirm öffnet das Create-Issue-Form neu (statt komplett abzubrechen).
func TestCreateConfirmCancelReopensIssueForm(t *testing.T) {
	m := openIssueConfirm(t)
	mi, _ := m.keyCreateConfirm(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("n")})
	m = mi.(model)
	if m.createConfirm {
		t.Error("n sollte das Confirm schließen")
	}
	if m.form == nil || m.formKind != "issue" {
		t.Errorf("n sollte das Create-Issue-Form neu öffnen (form=%v kind=%q)", m.form != nil, m.formKind)
	}
	if m.createDraft != nil {
		t.Error("Draft sollte nach Reopen verbraucht sein")
	}
}

// esc am Confirm verhält sich wie n (zurück ins Form).
func TestCreateConfirmEscReopensIssueForm(t *testing.T) {
	m := openIssueConfirm(t)
	mi, _ := m.keyCreateConfirm(tea.KeyMsg{Type: tea.KeyEsc})
	m = mi.(model)
	if m.form == nil || m.formKind != "issue" {
		t.Errorf("esc sollte das Create-Issue-Form neu öffnen (form=%v kind=%q)", m.form != nil, m.formKind)
	}
}

// y/enter legt an, feuert den Create-Cmd und räumt den Draft (kein späteres Reopen).
func TestCreateConfirmAcceptClearsDraft(t *testing.T) {
	m := openIssueConfirm(t)
	mi, cmd := m.keyCreateConfirm(tea.KeyMsg{Type: tea.KeyEnter})
	m = mi.(model)
	if cmd == nil {
		t.Error("enter am Confirm sollte den geparkten Create-Cmd feuern")
	}
	if m.createDraft != nil {
		t.Error("Draft sollte nach der Anlage geräumt sein")
	}
	if m.form != nil {
		t.Error("nach Anlage kein Form erwartet")
	}
}
