package config

import "testing"

// DD2-224: editor-Feld — Default nvim, vom User per YAML überschreibbar, leer
// im Override lässt den Default stehen.
func TestEditorDefaultIsNvim(t *testing.T) {
	if got := DefaultSettings().Editor; got != "nvim" {
		t.Errorf("DefaultSettings().Editor=%q, want nvim", got)
	}
}

func TestEditorLoadDefaultsWithoutFile(t *testing.T) {
	t.Setenv("HOME", t.TempDir()) // keine Config-Datei → reine Defaults
	got, _ := LoadSettings()
	if got.Editor != "nvim" {
		t.Errorf("LoadSettings ohne Datei: Editor=%q, want nvim", got.Editor)
	}
}

func TestEditorMergeOverride(t *testing.T) {
	base := DefaultSettings()
	// Gesetzter Override gewinnt …
	if got := mergeSettings(base, Settings{Editor: "code -w"}).Editor; got != "code -w" {
		t.Errorf("Override Editor=%q, want 'code -w'", got)
	}
	// … leerer Override lässt den Default (nvim) stehen.
	if got := mergeSettings(base, Settings{Editor: ""}).Editor; got != "nvim" {
		t.Errorf("leerer Override Editor=%q, want nvim (Default)", got)
	}
}
