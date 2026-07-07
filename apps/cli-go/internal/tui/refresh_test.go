package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// DD2-72 R2/DD2-272: Der manuelle Refresh setzt seinen Bestätigungs-Toast im
// refreshedMsg-Handler (NICHT vor dem Reload), damit der nachlaufende sprintMsg
// (der den Toast räumt, sofern nicht sticky, DD2-57) ihn nicht wegräumt.
// Regression: Toast muss nach dem Handler stehen + die Items des aktualisierten
// Sprints im Cache landen.
func TestRefreshedMsgSetsToastAndUpdatesCache(t *testing.T) {
	m := model{curSprint: &api.Sprint{ID: 7}}
	msg := refreshedMsg{
		milestones: []api.Milestone{{ID: 1, Name: "M", Status: "in_progress"}},
		sprints:    map[int]*api.Sprint{7: {ID: 7, Items: []api.Issue{{ID: 99}}}},
	}
	mi, cmd := m.Update(msg)
	got := mi.(model)
	if got.toast == nil || !strings.Contains(got.toast.title, "reloaded") {
		t.Errorf("Toast fehlt, toast = %+v", got.toast)
	}
	if cmd == nil {
		t.Error("erwartet toastTimeout-Cmd (Auto-Clear), bekam nil")
	}
	if len(got.treeIssues[7]) != 1 {
		t.Errorf("treeIssues[7] nicht aktualisiert: %v", got.treeIssues[7])
	}
	if got.curSprint == nil || len(got.curSprint.Items) != 1 {
		t.Errorf("curSprint-Items nicht aktualisiert: %+v", got.curSprint)
	}
}
