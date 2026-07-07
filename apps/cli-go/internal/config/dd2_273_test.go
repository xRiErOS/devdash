package config

// dd2_273_test.go — DD2-273: LastSeenVersion im leichten Runtime-State-Layer
// (state.json), Read-Modify-Write-Semantik von SetLastSeenVersion.

import "testing"

func TestSetLastSeenVersionPreservesLastProject(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)

	if err := Save(State{LastProject: "devd2"}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := SetLastSeenVersion("1.2.3"); err != nil {
		t.Fatalf("SetLastSeenVersion: %v", err)
	}
	got, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.LastProject != "devd2" {
		t.Errorf("LastProject sollte erhalten bleiben (Read-Modify-Write), got %q", got.LastProject)
	}
	if got.LastSeenVersion != "1.2.3" {
		t.Errorf("LastSeenVersion = %q, want 1.2.3", got.LastSeenVersion)
	}
}

func TestSetLastSeenVersionOnEmptyState(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("HOME", tmp)

	if err := SetLastSeenVersion("0.1.0"); err != nil {
		t.Fatalf("SetLastSeenVersion: %v", err)
	}
	got, _ := Load()
	if got.LastSeenVersion != "0.1.0" {
		t.Errorf("LastSeenVersion = %q, want 0.1.0", got.LastSeenVersion)
	}
	if got.LastProject != "" {
		t.Errorf("LastProject sollte leer bleiben, got %q", got.LastProject)
	}
}
