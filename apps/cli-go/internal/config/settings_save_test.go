package config

import (
	"os"
	"path/filepath"
	"testing"
)

// DD2-125: SaveUserSettings schreibt die User-Config; LoadSettings liest sie zurück.
func TestSaveUserSettingsRoundtrip(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)

	if err := SaveUserSettings("#abcdef", "devd2", 30, 50); err != nil {
		t.Fatalf("SaveUserSettings: %v", err)
	}
	got, _ := LoadSettings()
	if got.Theme.Accent != "#abcdef" {
		t.Errorf("accent=%q, want #abcdef", got.Theme.Accent)
	}
	if got.Layout.TreeWidth != 30 || got.Layout.ModalWidth != 50 {
		t.Errorf("layout=%+v, want tree=30 modal=50", got.Layout)
	}
	if got.StartProject != "devd2" { // DD2-162: start_project round-trippt
		t.Errorf("start_project=%q, want devd2", got.StartProject)
	}
}

// DD2-125: Read-modify-write erhält bestehende keybindings (DD2-34) in der Datei.
func TestSaveUserSettingsPreservesKeybindings(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	path := filepath.Join(tmp, ".config", "devd-cli", "config.yaml")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("keybindings:\n  down: j\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := SaveUserSettings("#112233", "", 28, 60); err != nil {
		t.Fatalf("SaveUserSettings: %v", err)
	}
	got, _ := LoadSettings()
	if got.Keybindings["down"] != "j" {
		t.Errorf("keybindings nach Save = %+v, want down:j erhalten", got.Keybindings)
	}
	if got.Theme.Accent != "#112233" {
		t.Errorf("accent=%q, want #112233", got.Theme.Accent)
	}
}

// DD2-125: ungültiger Accent wird beim Reload verworfen (validateSettings).
func TestSaveUserSettingsInvalidAccentDropped(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)
	if err := SaveUserSettings("not-a-hex", "", 40, 70); err != nil {
		t.Fatalf("SaveUserSettings: %v", err)
	}
	got, _ := LoadSettings()
	if got.Theme.Accent != "" {
		t.Errorf("ungültiger Accent sollte verworfen werden, got %q", got.Theme.Accent)
	}
}
