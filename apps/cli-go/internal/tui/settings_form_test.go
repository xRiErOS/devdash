package tui

// settings_form_test.go — DD2-125: Settings-Form (Build, Apply, Palette-Dispatch).

import (
	"testing"

	"devd-cli/internal/config"
)

// DD2-125: saveAndApplySettings schreibt + lädt neu + wendet Modalbreite an.
func TestSaveAndApplySettings(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	old := defaultModalWidth
	defer func() { defaultModalWidth = old }()

	oldEd := configuredEditor
	defer func() { configuredEditor = oldEd }()

	m := model{}
	m2, err := m.saveAndApplySettings("#abcdef", 30, 50, "code -w")
	if err != nil {
		t.Fatalf("saveAndApplySettings: %v", err)
	}
	if m2.cfg.Layout.TreeWidth != 30 || m2.cfg.Layout.ModalWidth != 50 {
		t.Errorf("cfg.Layout=%+v, want tree=30 modal=50", m2.cfg.Layout)
	}
	if defaultModalWidth != 50 {
		t.Errorf("defaultModalWidth=%d, want 50 (angewendet)", defaultModalWidth)
	}
	if configuredEditor != "code -w" { // DD2-221 (D04): Editor live übernommen
		t.Errorf("configuredEditor=%q, want 'code -w' (live-apply)", configuredEditor)
	}
	// Persistenz: ein frischer Load liefert dieselben Werte.
	got, _ := config.LoadSettings()
	if got.Theme.Accent != "#abcdef" {
		t.Errorf("persistierter accent=%q, want #abcdef", got.Theme.Accent)
	}
	if got.Editor != "code -w" {
		t.Errorf("persistierter editor=%q, want 'code -w'", got.Editor)
	}
}

// DD2-125: Clamp greift beim Reload (out-of-range tree_width → Default 36).
func TestSaveAndApplySettingsClamps(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	old := defaultModalWidth
	defer func() { defaultModalWidth = old }()

	m := model{}
	m2, err := m.saveAndApplySettings("", 999, 999, "nvim")
	if err != nil {
		t.Fatalf("saveAndApplySettings: %v", err)
	}
	if m2.cfg.Layout.TreeWidth != 60 || m2.cfg.Layout.ModalWidth != 100 {
		t.Errorf("Clamp verfehlt: %+v, want tree=60 modal=100", m2.cfg.Layout)
	}
}

// DD2-125: Command Palette → "Einstellungen" öffnet die Settings-Form.
func TestPaletteOpensSettings(t *testing.T) {
	m := model{}
	m2, _ := m.dispatchPalette("go_settings")
	if m2.(model).formKind != "settings" {
		t.Errorf("go_settings → formKind=%q, want settings", m2.(model).formKind)
	}
	if m2.(model).form == nil {
		t.Errorf("go_settings → form nil, want Settings-Form")
	}
}

// DD2-125: Form-Validatoren — Accent (Hex/leer) und positive Zahlen.
func TestSettingsValidators(t *testing.T) {
	if err := validateAccent(""); err != nil {
		t.Errorf("leerer Accent sollte gültig sein: %v", err)
	}
	if err := validateAccent("#c6a0f6"); err != nil {
		t.Errorf("gültiger Hex abgelehnt: %v", err)
	}
	if validateAccent("xyz") == nil {
		t.Errorf("ungültiger Accent sollte abgelehnt werden")
	}
	if validatePosInt("36") != nil {
		t.Errorf("36 sollte gültig sein")
	}
	if validatePosInt("0") == nil || validatePosInt("abc") == nil {
		t.Errorf("0/abc sollten abgelehnt werden")
	}
}
