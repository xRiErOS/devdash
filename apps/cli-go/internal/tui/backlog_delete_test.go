package tui

// DD2-65: Issues mit `d` löschen. Confirm-Dialog (kein Cascade), DeleteIssue-API,
// in-place-Entfernung aus den Caches. Root-Cause-Fix für DD2-85 (Delete-Leak).

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
)

// d im Backlog öffnet den Issue-Lösch-Confirm (delKind=issue, ohne Cascade-Load).
func TestBacklogDeleteOpensConfirm(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("d"))
	m := mi.(model)
	if !m.delConfirm || m.delKind != "issue" {
		t.Fatalf("d → delConfirm=%v delKind=%q, want true/issue", m.delConfirm, m.delKind)
	}
	if m.delID != 1 {
		t.Errorf("delID=%d, want 1 (DD2-1)", m.delID)
	}
	if m.delLoading {
		t.Error("Issue-Delete braucht keinen Cascade-Preview → delLoading muss false sein")
	}
}

// y im Confirm löst den Delete aus (Dialog zu, Cmd gesetzt).
func TestBacklogDeleteConfirmFires(t *testing.T) {
	mi, _ := backlogMDModel().keyBacklog(key("d"))
	m := mi.(model)
	md, cmd := m.keyDelete(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("y")})
	if md.(model).delConfirm {
		t.Error("y sollte den Confirm schließen")
	}
	if cmd == nil {
		t.Error("y sollte den Delete-Cmd auslösen")
	}
}

// deleteDoneMsg(issue) entfernt das Issue in-place aus dem Backlog-Cache.
func TestBacklogDeleteDoneRemovesFromCache(t *testing.T) {
	m := backlogFilterModel() // 3 Issues (id 1,2,3)
	m.detailFocus = true
	mi, _ := m.Update(deleteDoneMsg{"issue", 2, "DD2-2"})
	m = mi.(model)
	for _, it := range m.backlog {
		if it.ID == 2 {
			t.Fatal("gelöschtes Issue noch im Backlog-Cache")
		}
	}
	if len(m.backlog) != 2 {
		t.Errorf("Backlog-Länge=%d, want 2", len(m.backlog))
	}
	if m.detailFocus {
		t.Error("nach Issue-Delete sollte der Detail-Fokus zurückfallen")
	}
}

// removeIssueByID filtert robust (auch bei nicht vorhandener ID / leerer Slice).
func TestRemoveIssueByID(t *testing.T) {
	items := []api.Issue{{ID: 1}, {ID: 2}, {ID: 3}}
	if got := removeIssueByID(items, 2); len(got) != 2 {
		t.Errorf("len=%d, want 2", len(got))
	}
	if got := removeIssueByID(nil, 5); len(got) != 0 {
		t.Errorf("nil-Slice → len=%d, want 0", len(got))
	}
}

// deleteBox zeigt für ein Issue den Issue-Header (kein Cascade-Count-Block).
func TestDeleteBoxIssueHeader(t *testing.T) {
	m := backlogMDModel()
	mi, _ := m.keyBacklog(key("d"))
	out := mi.(model).deleteBox()
	if !strings.Contains(out, "Delete issue") {
		t.Errorf("deleteBox sollte 'Issue löschen' zeigen: %q", out)
	}
}
