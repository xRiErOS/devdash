package config

// DD2-40: TUI-Settings über eine YAML-Config. Geladen wird in zwei Schichten —
// erst die User-Config (~/.config/devd-cli/config.yaml), dann eine optionale
// lokale Override-Config (./config.yaml). Gesetzte Felder der späteren Schicht
// gewinnen; fehlende Dateien sind kein Fehler (Defaults greifen). Hot-Reload ist
// bewusst nicht enthalten (zweite Stufe laut Acceptance).
//
// Beispiel ~/.config/devd-cli/config.yaml:
//
//	theme:
//	  accent: "#f5a97f"        # überschreibt den Mauve-Akzent (Cursor/Header)
//	layout:
//	  tree_width: 32           # Breite der schmalen Baum-Spalte (Tree-Layout)
//	  modal_width: 56          # Wunschbreite der Standard-Modal-Box
//	keybindings:               # reserviert (DD2-34) — geparst, noch nicht angewendet
//	  down: j

import (
	"os"
	"path/filepath"
	"regexp"

	"gopkg.in/yaml.v3"
)

// Settings ist die TUI-Konfiguration (YAML). Nullwerte bedeuten „nicht gesetzt"
// und werden beim Merge von der jeweils tieferen Schicht bzw. den Defaults gefüllt.
type Settings struct {
	Theme       ThemeSettings     `yaml:"theme"`
	Layout      LayoutSettings    `yaml:"layout"`
	Keybindings map[string]string `yaml:"keybindings"` // reserviert (DD2-34)
}

type ThemeSettings struct {
	Accent string `yaml:"accent"` // Hex (#rrggbb) oder "" = Built-in-Akzent
}

type LayoutSettings struct {
	TreeWidth  int `yaml:"tree_width"`
	ModalWidth int `yaml:"modal_width"`
}

// Defaults — Single Source der eingebauten Werte (= bisheriges Verhalten).
const (
	defTreeWidth  = 36
	defModalWidth = 64
	minTreeWidth  = 24
	maxTreeWidth  = 60
	minModalWidth = 30
	maxModalWidth = 100
)

var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// DefaultSettings liefert die eingebauten Defaults (greifen ohne Config-Datei).
func DefaultSettings() Settings {
	return Settings{
		Layout: LayoutSettings{TreeWidth: defTreeWidth, ModalWidth: defModalWidth},
	}
}

// settingsPaths liefert die Lade-Reihenfolge: User-Config zuerst, lokaler
// Override zuletzt (gewinnt). Pfad-Fehler (kein HOME) → nur lokaler Override.
func settingsPaths() []string {
	var paths []string
	if home, err := os.UserHomeDir(); err == nil {
		paths = append(paths, filepath.Join(home, ".config", "devd-cli", "config.yaml"))
	}
	paths = append(paths, "config.yaml") // lokaler Override (CWD)
	return paths
}

// LoadSettings lädt Defaults → User-Config → lokaler Override (gemerged) und
// validiert/clamped das Ergebnis. Gibt zusätzlich die tatsächlich gelesenen
// Pfade zurück (für Diagnose). Fehlende/kaputte Dateien werden übersprungen.
func LoadSettings() (Settings, []string) {
	s := DefaultSettings()
	var sources []string
	for _, p := range settingsPaths() {
		data, err := os.ReadFile(p)
		if err != nil {
			continue // fehlt → nächste Schicht
		}
		over, err := parseSettings(data)
		if err != nil {
			continue // kaputtes YAML ignorieren statt crashen
		}
		s = mergeSettings(s, over)
		sources = append(sources, p)
	}
	return validateSettings(s), sources
}

// UserConfigPath liefert den Pfad der User-Config (~/.config/devd-cli/config.yaml).
func UserConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "devd-cli", "config.yaml"), nil
}

// SaveUserSettings schreibt theme.accent + layout.tree_width/modal_width in die
// USER-Config (DD2-125) — NICHT den lokalen Override. Read-modify-write: eine
// bestehende Datei wird gelesen, damit andere Felder (z.B. keybindings, DD2-34)
// erhalten bleiben. Leerer accent löscht das Feld. Verzeichnis wird angelegt.
func SaveUserSettings(accent string, treeWidth, modalWidth int) error {
	path, err := UserConfigPath()
	if err != nil {
		return err
	}
	var s Settings
	if data, rerr := os.ReadFile(path); rerr == nil {
		_ = yaml.Unmarshal(data, &s) // kaputtes YAML → bei Null beginnen
	}
	s.Theme.Accent = accent
	s.Layout.TreeWidth = treeWidth
	s.Layout.ModalWidth = modalWidth
	out, err := yaml.Marshal(s)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, out, 0o644)
}

// parseSettings dekodiert YAML in Settings (reine Funktion, FS-frei — testbar).
func parseSettings(data []byte) (Settings, error) {
	var s Settings
	if err := yaml.Unmarshal(data, &s); err != nil {
		return Settings{}, err
	}
	return s, nil
}

// mergeSettings legt over über base: nur gesetzte (non-zero) Felder gewinnen.
// Breiten von 0 gelten als „nicht gesetzt" (0 ist nie eine gültige Breite).
func mergeSettings(base, over Settings) Settings {
	if over.Theme.Accent != "" {
		base.Theme.Accent = over.Theme.Accent
	}
	if over.Layout.TreeWidth != 0 {
		base.Layout.TreeWidth = over.Layout.TreeWidth
	}
	if over.Layout.ModalWidth != 0 {
		base.Layout.ModalWidth = over.Layout.ModalWidth
	}
	if len(over.Keybindings) > 0 {
		if base.Keybindings == nil {
			base.Keybindings = map[string]string{}
		}
		for k, v := range over.Keybindings {
			base.Keybindings[k] = v
		}
	}
	return base
}

// validateSettings clamped Breiten in sinnvolle Bereiche und verwirft einen
// ungültigen Accent (kein #rrggbb) → Built-in-Akzent bleibt.
func validateSettings(s Settings) Settings {
	s.Layout.TreeWidth = clampInt(s.Layout.TreeWidth, minTreeWidth, maxTreeWidth, defTreeWidth)
	s.Layout.ModalWidth = clampInt(s.Layout.ModalWidth, minModalWidth, maxModalWidth, defModalWidth)
	if s.Theme.Accent != "" && !hexColor.MatchString(s.Theme.Accent) {
		s.Theme.Accent = ""
	}
	return s
}

// clampInt hält v in [lo,hi]; 0/negativ (= nicht gesetzt) → def.
func clampInt(v, lo, hi, def int) int {
	if v <= 0 {
		return def
	}
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
