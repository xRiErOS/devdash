package tui

import (
	"testing"

	"devd-cli/internal/api"
)

// TestCreateProjectPaletteOpensForm — "create: project" öffnet die Anlage-Form.
func TestCreateProjectPaletteOpensForm(t *testing.T) {
	m := paletteModel()
	mi, _ := m.dispatchPalette("create_project")
	m = mi.(model)
	if m.form == nil {
		t.Fatal("create_project öffnet kein Formular")
	}
	if m.formKind != "project_create" {
		t.Errorf("formKind=%q, want project_create", m.formKind)
	}
}

// TestProjectCreateIsConfirmKind — Anlage läuft über den y/n-Confirm (isCreateKind).
func TestProjectCreateIsConfirmKind(t *testing.T) {
	if !isCreateKind("project_create") {
		t.Error("project_create sollte ein Create-Kind sein (Confirm vor Anlage)")
	}
}

// TestDeleteProjectPaletteOpensConfirm — "delete: project" öffnet den Cascade-Confirm
// aufs aktive Projekt (delKind=project, delID = Projekt-ID).
func TestDeleteProjectPaletteOpensConfirm(t *testing.T) {
	m := paletteModel() // aktives Projekt ID 9
	mi, _ := m.dispatchPalette("delete_project")
	m = mi.(model)
	if !m.delConfirm {
		t.Fatal("delete_project öffnet keinen Lösch-Dialog")
	}
	if m.delKind != "project" || m.delID != 9 {
		t.Errorf("delKind=%q delID=%d, want project/9", m.delKind, m.delID)
	}
}

// TestDeleteProjectHiddenWithoutActiveProject — ohne aktives Projekt taucht die
// Lösch-Aktion NICHT in der Palette auf (keine Ziel-Entität).
func TestDeleteProjectHiddenWithoutActiveProject(t *testing.T) {
	m := newModel(nil, nil, api.NewClient(""))
	m.view = viewHome
	for _, a := range paletteActions(&m) {
		if a.id == "delete_project" {
			t.Fatal("delete_project darf ohne aktives Projekt nicht in der Palette sein")
		}
	}
	// create_project ist dagegen immer verfügbar (auch aus der Lobby).
	found := false
	for _, a := range paletteActions(&m) {
		if a.id == "create_project" {
			found = true
		}
	}
	if !found {
		t.Error("create_project sollte immer verfügbar sein")
	}
}
