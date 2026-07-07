package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// DD2-93/272: Der Erfolgs-Toast nach dem Anlegen (createdMsg) überlebt den
// nachfolgenden Reload-Zyklus (sprintMsg clobbert ihn nicht), bis er explizit
// geräumt wird — die PO sieht sicher, dass gespeichert wurde. Sticky (DD2-272
// AC2) heißt: kein Auto-Dismiss-Timer, aber ein gezielter toastExpiredMsg mit
// der aktuellen Generation räumt ihn trotzdem (z.B. bei Replace/Klick).
func TestCreatedToastSurvivesReload(t *testing.T) {
	m := browseModel()
	mi, _ := m.Update(createdMsg{"issue", "DD2-9 Foo"})
	m = mi.(model)
	if m.toast == nil || !m.toast.sticky || m.toast.title == "" {
		t.Fatal("createdMsg sollte einen Sticky-Erfolgs-Toast setzen")
	}
	before := m.toast.title

	// Reload-Zyklus: ein sprintMsg darf den Sticky-Toast nicht löschen.
	m.view = viewReviewSprint
	m.curSprint = &api.Sprint{ID: 1, Items: []api.Issue{{ID: 1, Key: "X-1"}}}
	mi, _ = m.Update(sprintMsg{&api.Sprint{ID: 1, Items: []api.Issue{{ID: 1, Key: "X-1"}}}})
	m = mi.(model)
	if m.toast == nil || m.toast.title != before {
		t.Errorf("sprintMsg clobberte den Sticky-Toast: %q → %+v", before, m.toast)
	}

	// Gezielter Clear (gleiche Generation) räumt den Toast.
	mi, _ = m.Update(toastExpiredMsg{m.toast.seq})
	m = mi.(model)
	if m.toast != nil {
		t.Errorf("toastExpiredMsg (gleiche Generation) sollte den Toast räumen, got %+v", m.toast)
	}
}
