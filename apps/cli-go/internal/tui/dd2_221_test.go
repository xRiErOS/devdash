package tui

// DD2-221: Projekt-Settings-Form über die Command Palette. name/slug/prefix
// editierbar (DD2-232 macht slug/prefix nicht mehr read-only). Plus: globaler
// Editor (D04) ist jetzt in der App-Settings-Form sichtbar/konfigurierbar.

import (
	"strings"
	"testing"

	"devd-cli/internal/api"
	"devd-cli/internal/config"
)

// Command Palette → "Project settings" öffnet die Projekt-Settings-Form.
func TestPaletteOpensProjectSettings(t *testing.T) {
	m := model{project: &api.Project{ID: 10, Name: "DevD 2.0", Slug: "devd2", Prefix: "DD2"}}
	mi, _ := m.dispatchPalette("go_project_settings")
	m2 := mi.(model)
	if m2.formKind != "project_settings" {
		t.Errorf("go_project_settings → formKind=%q, want project_settings", m2.formKind)
	}
	if m2.form == nil {
		t.Fatal("go_project_settings → form nil, want Projekt-Settings-Form")
	}
}

// Der Palette-Eintrag existiert und ist per Fuzzy-Filter auffindbar.
func TestProjectSettingsPaletteEntryPresent(t *testing.T) {
	m := model{}
	found := false
	for _, a := range paletteActions(&m) {
		if a.id == "go_project_settings" {
			found = true
		}
	}
	if !found {
		t.Error("paletteActions enthält keinen 'go_project_settings'-Eintrag")
	}
}

// Die Form ist mit dem aktiven Projekt vorbelegt: name editierbar, slug+prefix sichtbar.
func TestProjectSettingsFormPrefill(t *testing.T) {
	m := model{project: &api.Project{ID: 10, Name: "DevD 2.0", Slug: "devd2", Prefix: "DD2"}}
	mi, _ := m.openForm("project_settings")
	v := mi.(model).form.View()
	for _, want := range []string{"DevD 2.0", "devd2", "DD2"} {
		if !strings.Contains(v, want) {
			t.Errorf("Form-View enthält %q nicht:\n%s", want, v)
		}
	}
}

// Submit liefert bei aktivem Projekt einen Save-Cmd; ohne Projekt einen Hinweis.
func TestProjectSettingsSubmit(t *testing.T) {
	// Mit Projekt → non-nil Save-Cmd.
	m := model{project: &api.Project{ID: 10, Name: "DevD 2.0"}, client: &api.Client{}}
	mi, _ := m.openForm("project_settings")
	m = mi.(model)
	if cmd := m.formCreateCmd(); cmd == nil {
		t.Error("project_settings-Submit mit Projekt sollte einen Cmd liefern")
	}

	// Ohne Projekt → Hinweis-Cmd (kein Crash, kein API-Call).
	m2 := model{}
	mi2, _ := m2.openForm("project_settings")
	m2 = mi2.(model)
	cmd2 := m2.formCreateCmd()
	if cmd2 == nil {
		t.Fatal("project_settings-Submit ohne Projekt sollte einen Hinweis-Cmd liefern")
	}
	if nm, ok := cmd2().(noticeMsg); !ok || !strings.Contains(nm.text, "no active project") {
		t.Errorf("ohne Projekt erwartet noticeMsg 'no active project', got %#v", cmd2())
	}
}

// projectUpdatedMsg spiegelt das frische Projekt in den Model-State (Topbar/Name).
func TestProjectUpdatedMsgReflectsName(t *testing.T) {
	m := model{project: &api.Project{ID: 10, Name: "Old"}}
	mi, _ := m.Update(projectUpdatedMsg{project: &api.Project{ID: 10, Name: "Renamed"}})
	m2 := mi.(model)
	if m2.project == nil || m2.project.Name != "Renamed" {
		t.Errorf("m.project nach Update = %+v, want Name=Renamed", m2.project)
	}
	if m2.errNote != "" {
		t.Errorf("Erfolg sollte errNote leeren, got %q", m2.errNote)
	}
}

// DD2-232: slug/prefix sind editierbare Input-Felder (nicht mehr read-only Note) —
// die Form baut per huh.NewInput().Validate(...) statt huh.NewNote(...), und der
// Save-Cmd ist confirm-gated (Impact-Vorschau vor riskanter Änderung).
func TestProjectSettingsSlugPrefixEditable(t *testing.T) {
	m := model{project: &api.Project{ID: 10, Name: "DevD 2.0", Slug: "devd2", Prefix: "DD2"}, client: &api.Client{}}
	mi, _ := m.openForm("project_settings")
	v := mi.(model).form.View()
	if strings.Contains(v, "read-only") {
		t.Errorf("slug/prefix sollten seit DD2-232 editierbar sein, Form zeigt aber noch 'read-only':\n%s", v)
	}
	if err := validateProjectSlug("bad slug!"); err == nil {
		t.Error("validateProjectSlug sollte ungültige Slugs ablehnen")
	}
	if err := validateProjectPrefix("toolongprefix"); err == nil {
		t.Error("validateProjectPrefix sollte ungültige Prefixe ablehnen")
	}
	if !isCreateKind("project_settings") {
		t.Error("project_settings sollte confirm-gated sein (DD2-232: Impact-Vorschau vor riskanter Änderung)")
	}
}

// projectUpdatedMsg mit err setzt errNote und lässt das Projekt unangetastet.
func TestProjectUpdatedMsgErrorKeepsProject(t *testing.T) {
	m := model{project: &api.Project{ID: 10, Name: "Keep"}}
	mi, _ := m.Update(projectUpdatedMsg{err: "boom"})
	m2 := mi.(model)
	if m2.errNote != "boom" {
		t.Errorf("errNote=%q, want boom", m2.errNote)
	}
	if m2.project == nil || m2.project.Name != "Keep" {
		t.Errorf("Projekt sollte bei Fehler unverändert bleiben, got %+v", m2.project)
	}
}

// DD2-221 (D04): die App-Settings-Form zeigt das editor-Feld, vorbelegt mit der Config.
func TestSettingsFormHasEditorField(t *testing.T) {
	// Höhe 40: seit DD2-162 hat die Settings-Form mehrere Felder —
	// huh viewport-limitiert bei kleiner Höhe; ein realer Terminal-Frame zeigt alle.
	m := model{width: 90, height: 40, cfg: config.Settings{Editor: "vim", Layout: config.LayoutSettings{TreeWidth: 36, ModalWidth: 64}}}
	mi, _ := m.openForm("settings")
	v := mi.(model).form.View()
	if !strings.Contains(v, "editor") {
		t.Errorf("Settings-Form-View ohne 'editor'-Feld:\n%s", v)
	}
	if !strings.Contains(v, "vim") {
		t.Errorf("Settings-Form-View ohne vorbelegten Editor-Wert 'vim':\n%s", v)
	}
}
