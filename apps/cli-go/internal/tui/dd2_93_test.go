package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-93: Der Erfolgs-Toast nach dem Anlegen (createdMsg) überlebt den
// nachfolgenden Reload-Zyklus (sprintMsg clobbert ihn nicht), bis der
// Auto-Clear ihn räumt — die PO sieht sicher, dass gespeichert wurde.
func TestCreatedToastSurvivesReload(t *testing.T) {
	m := columnsModel()
	mi, _ := m.Update(createdMsg{"issue", "DD2-9 Foo"})
	m = mi.(model)
	if !m.statusSticky || m.status == "" {
		t.Fatal("createdMsg sollte einen Sticky-Erfolgs-Toast setzen")
	}
	before := m.status

	// Reload-Zyklus: ein sprintMsg darf den Sticky-Toast nicht löschen.
	m.view = viewReviewSprint
	m.curSprint = &api.Sprint{ID: 1, Items: []api.Issue{{ID: 1, Key: "X-1"}}}
	mi, _ = m.Update(sprintMsg{&api.Sprint{ID: 1, Items: []api.Issue{{ID: 1, Key: "X-1"}}}})
	m = mi.(model)
	if m.status != before {
		t.Errorf("sprintMsg clobberte den Sticky-Toast: %q → %q", before, m.status)
	}

	// Auto-Clear (gleiche Generation) räumt Toast + Sticky-Schutz.
	mi, _ = m.Update(clearStatusMsg{m.statusSeq})
	m = mi.(model)
	if m.status != "" || m.statusSticky {
		t.Errorf("clearStatusMsg sollte Toast+Sticky zurücksetzen (status=%q sticky=%v)", m.status, m.statusSticky)
	}
}
