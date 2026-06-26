package tests

import (
	"testing"

	"devd-cli/internal/config"
)

func TestStateRoundTrip(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	// frisch / fehlende Datei → leerer Default, kein Fehler
	s, err := config.Load()
	if err != nil {
		t.Fatalf("Load auf leerem HOME: %v", err)
	}
	if s.LastProject != "" {
		t.Errorf("LastProject = %q, want leer", s.LastProject)
	}

	if err := config.Save(config.State{LastProject: "devd2"}); err != nil {
		t.Fatal(err)
	}
	got, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got.LastProject != "devd2" {
		t.Errorf("nach Save/Load LastProject = %q, want devd2", got.LastProject)
	}
}
