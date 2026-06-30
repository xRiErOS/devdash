package tui

// form_edit_settings.go — DD2-125: Settings-Form. Bearbeitet die User-Config
// (~/.config/devd-cli/config.yaml) direkt aus der TUI (Aufruf via Command
// Palette → "Einstellungen"). Felder: theme.accent, layout.tree_width,
// layout.modal_width. Keybindings = read-only Placeholder (→ DD2-34). Nach Save
// wird die Config neu geladen (LoadSettings) und der Merge angewendet.

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"devd-cli/internal/config"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/huh"
)

var settingsHexRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// validateAccent: leer (= Built-in-Akzent) ODER gültiges #rrggbb.
func validateAccent(s string) error {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	if !settingsHexRe.MatchString(s) {
		return fmt.Errorf("expected hex #rrggbb (or empty for default)")
	}
	return nil
}

// validatePosInt: positive Ganzzahl (Clamp greift beim Reload, validateSettings).
func validatePosInt(s string) error {
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || n <= 0 {
		return fmt.Errorf("expected a positive number")
	}
	return nil
}

// buildSettingsForm baut das Settings-Formular, vorbelegt mit der aktiven Config.
func buildSettingsForm(cfg config.Settings) *huh.Form {
	accent := cfg.Theme.Accent
	startProject := cfg.StartProject
	tw := strconv.Itoa(cfg.Layout.TreeWidth)
	mw := strconv.Itoa(cfg.Layout.ModalWidth)
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("accent").Title("theme.accent").
			Description("Hex #rrggbb — empty = built-in mauve").Value(&accent).Validate(validateAccent),
		huh.NewInput().Key("start_project").Title("start_project").
			Description("Slug/prefix/id to boot into — empty = project picker (resolved at start)").Value(&startProject),
		huh.NewInput().Key("tree_width").Title("layout.tree_width").
			Description("Tree column width (24–60)").Value(&tw).Validate(validatePosInt),
		huh.NewInput().Key("modal_width").Title("layout.modal_width").
			Description("Modal box width (30–100)").Value(&mw).Validate(validatePosInt),
		huh.NewNote().Title("keybindings").
			Description("read-only — key remapping comes in DD2-34"),
	))
}

// saveAndApplySettings schreibt die User-Config, lädt sie neu (mit Clamp/Merge)
// und wendet den Akzent + die Modalbreite global an. Single Source für den
// Submit-Pfad (formCreateCmd) und Tests. startProject (DD2-162) wird nur persistiert
// (kein Live-Resolve im Form-Pfad — der Boot löst auf, Fallback Picker bei ungültig).
func (m model) saveAndApplySettings(accent, startProject string, treeWidth, modalWidth int) (model, error) {
	if err := config.SaveUserSettings(accent, startProject, treeWidth, modalWidth); err != nil {
		return m, err
	}
	cfg, _ := config.LoadSettings() // re-read + clamp + Merge (User + lokaler Override)
	m.cfg = cfg
	if cfg.Theme.Accent != "" {
		theme.SetAccent(cfg.Theme.Accent)
	}
	defaultModalWidth = cfg.Layout.ModalWidth
	return m, nil
}
