package tui

// DD2-85: Die Delete-Action darf NIE einen rohen API-Call-String im UI zeigen —
// sie öffnet immer einen sauberen Confirm. Regression-Netz für alle Issue-d-Pfade
// (Backlog, Tree-Detail, Columns-Ranger). Root-Cause war das fehlende DD2-65.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
)

// Columns-Ranger: d auf einem Issue (depth 2) öffnet den Confirm statt eines no-op
// oder rohen Request-Strings.
func TestColumnsIssueDeleteConfirm(t *testing.T) {
	m := columnsModel()
	m.depth = 2
	m.curSprint = &api.Sprint{ID: 10, Items: []api.Issue{
		{ID: 7, Key: "SPF-7", Title: "Crash", Status: "new", Type: "bug"},
	}}
	m.ilist.setLen(1)
	mi, _ := m.keyColumns(key("d"))
	mm := mi.(model)
	if !mm.delConfirm || mm.delKind != "issue" || mm.delID != 7 {
		t.Fatalf("Columns d@depth2 → delConfirm=%v kind=%q id=%d, want true/issue/7",
			mm.delConfirm, mm.delKind, mm.delID)
	}
}

// Der Confirm-Dialog zeigt keinen rohen API-/HTTP-Pfad (DD2-85-Kern).
func TestDeleteBoxNoRawAPICall(t *testing.T) {
	m := backlogMDModel()
	mi, _ := m.keyBacklog(key("d"))
	out := mi.(model).deleteBox()
	for _, leak := range []string{"/api/", "DELETE ", "http"} {
		if strings.Contains(out, leak) {
			t.Errorf("deleteBox leakt rohen Request-Teil %q: %q", leak, out)
		}
	}
	if !strings.Contains(out, "Delete issue") {
		t.Errorf("erwarteter Confirm-Header fehlt: %q", out)
	}
}

// d auf einem Issue ist in JEDEM Issue-tragenden Screen ein Confirm — kein Pfad
// fällt mehr in einen Fallback (Backlog-Liste, Backlog-/Tree-Detail-Fokus).
func TestIssueDeleteConfirmEverywhere(t *testing.T) {
	// Backlog-Liste
	if mi, _ := backlogMDModel().keyBacklog(key("d")); !mi.(model).delConfirm {
		t.Error("Backlog-Liste: d öffnet keinen Confirm")
	}
	// Backlog-Detail-Fokus (geteilte Maschine)
	mf, _ := backlogMDModel().keyBacklog(key("l")) // in den Detail-Fokus
	if md, _ := mf.(model).keyBacklog(key("d")); !md.(model).delConfirm {
		t.Error("Backlog-Detail: d öffnet keinen Confirm")
	}
}
