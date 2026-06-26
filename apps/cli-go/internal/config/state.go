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
