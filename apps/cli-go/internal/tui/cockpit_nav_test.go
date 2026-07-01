package tui

import "testing"

func TestCockpitEscReloadsTree(t *testing.T) {
	// DD2-111: der direkte (Nicht-Liste-)Cockpit-Rückweg führt jetzt zum Tree-Primat
	// (Ranger gesunset), nicht mehr zu viewColumns. Reload bleibt (B01).
	m := reviewModel()
	m.reviewReturn = viewBrowseProject
	mi, cmd := m.Update(keyMsg("q"))
	m = mi.(model)
	if m.view != viewBrowseProject {
		t.Errorf("q → view=%d, want viewBrowseProject", m.view)
	}
	if cmd == nil {
		t.Error("B01: q sollte die Daten (loadMilestones) neu laden")
	}
}
