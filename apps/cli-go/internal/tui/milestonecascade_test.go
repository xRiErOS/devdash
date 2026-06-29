package tui

import (
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// DD2-28: nur nicht-terminale Sprints zählen für den Cascade-Confirm.
func TestOpenSprintCount(t *testing.T) {
	sp := []api.Sprint{
		{Status: "in_progress"}, {Status: "completed"}, {Status: "to_review"},
		{Status: "cancelled"}, {Status: "completed"},
	}
	if got := openSprintCount(sp); got != 2 {
		t.Errorf("openSprintCount=%d, want 2 (in_progress+to_review)", got)
	}
}

// esc bricht den Cascade-Confirm ab, ohne zu schließen.
func TestKeyMilestoneCascadeEscCancels(t *testing.T) {
	m := model{mcConfirm: true, mcID: 5}
	nm, _ := m.keyMilestoneCascade(tea.KeyMsg{Type: tea.KeyEsc})
	if nm.(model).mcConfirm {
		t.Error("esc muss mcConfirm zurücksetzen")
	}
}
