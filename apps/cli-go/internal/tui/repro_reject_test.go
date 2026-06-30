package tui

// Reproduktions-Tests für die PO-Rejects DD2-29 / DD2-23: simulieren die exakte
// PO-Aktion durch Update()/View() statt die Helfer isoliert. Zeigt, ob ein echter
// Logik-Bug vorliegt oder die Wirkung nur unsichtbar/unerreichbar ist.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

func reproBrowseModel(view viewID, depth int) model {
	iss := api.Issue{ID: 5, Key: "DD2-99", Title: "Repro", Status: "to_review", Type: "bug", Priority: 2}
	sp := api.Sprint{ID: 3, Key: "DD2#9", Name: "Sprint", Status: "to_review", Items: []api.Issue{iss}}
	ms := api.Milestone{ID: 1, Name: "Meilenstein-Eins", Status: "in_progress", Sprints: []api.Sprint{sp}}
	m := model{view: view, depth: depth, width: 120, height: 40}
	m.milestones = []api.Milestone{ms}
	m.mlist.setLen(1)
	m.slist.setLen(1)
	m.curSprint = &sp
	m.ilist.setLen(1)
	return m
}

// DD2-29: s im Issue-Detail muss das Status-Menü öffnen.
func TestReproDetailSOpensIssueStatus(t *testing.T) {
	m := reproBrowseModel(viewDetailIssue, 2)
	nm, _ := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("s")})
	if !nm.(model).statusPick {
		t.Error("s im Detail öffnet das Issue-Status-Menü NICHT (statusPick=false)")
	}
}

// DD2-23: Sprint-Detail muss die Meilenstein-Zeile rendern (Fallback Eltern-Name).
func TestReproSprintDetailShowsMilestone(t *testing.T) {
	m := reproBrowseModel(viewDetailSprint, 1)
	out := m.View()
	if !strings.Contains(out, "Milestone") || !strings.Contains(out, "Meilenstein-Eins") {
		t.Errorf("Sprint-Detail zeigt den Meilenstein-Namen NICHT.\n--- View ---\n%s", out)
	}
}
