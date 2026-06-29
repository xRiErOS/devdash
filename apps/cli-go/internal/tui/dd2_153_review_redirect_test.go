package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-153: Root-Cause. milestonesMsg → syncSprint() lädt den columns-SELEKTIERTEN
// Sprint (default der erste). Steht im Review ein ANDERER Sprint offen (curSprint
// ≠ selSprint), nullt syncSprint curSprint und lädt den falschen ersten Sprint →
// der createdMsg-Handler darf diesen Pfad im Review NICHT nehmen.
func TestDD2153_SyncSprintClobbersReviewSprint(t *testing.T) {
	m := reviewModel() // columns-Selektion = Sprint ID 10
	// PO reviewt einen anderen Sprint als den columns-ersten:
	m.curSprint = &api.Sprint{ID: 20, Key: "SPF#3", Status: "to_review"}

	if sel := m.selSprint(); sel == nil || sel.ID == m.curSprint.ID {
		t.Fatalf("Setup-Annahme verletzt: selSprint=%v, curSprint=20", sel)
	}
	cmd := m.syncSprint()
	if m.curSprint != nil {
		t.Errorf("syncSprint sollte curSprint nullen (Clobber-Beweis), ist aber %v", m.curSprint)
	}
	if cmd == nil {
		t.Error("syncSprint sollte den (falschen) columns-ersten Sprint laden")
	}
}

// DD2-153: createdMsg{issue} im Review behält den Review-Kontext (view + curSprint)
// und dispatcht einen Reload — kein Redirect auf das erste Review der Liste.
func TestDD2153_CreatedIssueInReviewKeepsContext(t *testing.T) {
	m := reviewModel()
	m.curSprint = &api.Sprint{ID: 20, Key: "SPF#3", Status: "to_review", Items: []api.Issue{
		{ID: 200, Key: "SPF-9", Title: "Z", Status: "to_review"},
	}}
	m.rlist.setLen(len(m.curSprint.Items))

	mi, cmd := m.Update(createdMsg{kind: "issue", label: "new"})
	got := mi.(model)
	if got.view != viewReviewSprint {
		t.Errorf("view=%d, want viewReviewSprint (kein Redirect)", got.view)
	}
	if got.curSprint == nil || got.curSprint.ID != 20 {
		t.Errorf("curSprint=%v, want unverändert ID 20", got.curSprint)
	}
	if cmd == nil {
		t.Error("createdMsg{issue} im Review sollte loadSprint(curSprint)+clear dispatchen")
	}
}
