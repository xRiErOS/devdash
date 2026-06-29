package tui

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"github.com/charmbracelet/x/ansi"
)

// DD2-72 R2: Der manuelle Refresh setzt seinen Bestätigungs-Toast im
// refreshedMsg-Handler (NICHT vor dem Reload), damit der nachlaufende sprintMsg
// (der m.status leert, DD2-57) ihn nicht wegräumt. Regression: Toast muss nach
// dem Handler stehen + die Items des aktualisierten Sprints im Cache landen.
func TestRefreshedMsgSetsToastAndUpdatesCache(t *testing.T) {
	m := model{curSprint: &api.Sprint{ID: 7}}
	msg := refreshedMsg{
		milestones: []api.Milestone{{ID: 1, Name: "M", Status: "in_progress"}},
		sprints:    map[int]*api.Sprint{7: {ID: 7, Items: []api.Issue{{ID: 99}}}},
	}
	mi, cmd := m.Update(msg)
	got := mi.(model)
	if s := ansi.Strip(got.status); !strings.Contains(s, "reloaded") {
		t.Errorf("Toast fehlt, status = %q", s)
	}
	if cmd == nil {
		t.Error("erwartet statusTimeout-Cmd (Auto-Clear), bekam nil")
	}
	if len(got.treeIssues[7]) != 1 {
		t.Errorf("treeIssues[7] nicht aktualisiert: %v", got.treeIssues[7])
	}
	if got.curSprint == nil || len(got.curSprint.Items) != 1 {
		t.Errorf("curSprint-Items nicht aktualisiert: %+v", got.curSprint)
	}
}
