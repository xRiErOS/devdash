// Package config persistiert leichten CLI-Zustand (zuletzt gewähltes Projekt)
// nach ~/.config/dd/state.json.
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// State ist der persistierte CLI-Zustand.
type State struct {
	LastProject string `json:"last_project"`
	// LastSeenVersion (DD2-273): letzte appVersion, die der Update-Checker der TUI
	// gesehen hat (leichter Runtime-State-Layer, NICHT die validierte Settings-
	// Datei/config.yaml). Weicht appVersion davon ab → Release-Notes-Overlay.
	LastSeenVersion string `json:"last_seen_version,omitempty"`
}

func statePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "dd", "state.json"), nil
}

// Load liest den State. Fehlende Datei → leerer Default ohne Fehler.
func Load() (State, error) {
	path, err := statePath()
	if err != nil {
		return State{}, err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return State{}, nil
	}
	if err != nil {
		return State{}, err
	}
	var s State
	if err := json.Unmarshal(data, &s); err != nil {
		return State{}, err
	}
	return s, nil
}

// Save schreibt den State (legt ~/.config/dd an).
func Save(s State) error {
	path, err := statePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// SetLastSeenVersion persistiert LastSeenVersion als Read-Modify-Write (DD2-273)
// — andere State-Felder (z.B. LastProject) bleiben erhalten, statt sie wie ein
// nackter Save(State{...}) mit dem Zero-Value zu überschreiben.
func SetLastSeenVersion(version string) error {
	s, _ := Load() // fehlende/kaputte Datei → Zero-State, s.LastProject bleibt ""
	s.LastSeenVersion = version
	return Save(s)
}
