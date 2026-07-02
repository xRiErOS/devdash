package tui

// form_create_project.go — Projekt-Anlage-Form. Über die Command Palette
// ("create: project") erreichbar (overlay_palette.go → openForm("project_create")).
// slug/name/prefix sind Pflicht; slug (a-z0-9-) und prefix (2-6 A-Z0-9) sind nach
// der Anlage immutable (prefix treibt die Issue-Keys). description optional.
// Werte werden nach Abschluss per keyed GetString gelesen (forms_shared-Konvention).

import (
	"fmt"
	"regexp"

	"github.com/charmbracelet/huh"
)

var (
	projectSlugRe   = regexp.MustCompile(`^[a-z0-9-]+$`)
	projectPrefixRe = regexp.MustCompile(`^[A-Z0-9]{2,6}$`)
)

func validateProjectSlug(s string) error {
	if !projectSlugRe.MatchString(s) {
		return fmt.Errorf("only a-z 0-9 - allowed")
	}
	return nil
}

func validateProjectPrefix(s string) error {
	if !projectPrefixRe.MatchString(s) {
		return fmt.Errorf("2-6 uppercase letters/digits")
	}
	return nil
}

// buildProjectCreateForm baut die Projekt-Anlage-Form.
func buildProjectCreateForm() *huh.Form {
	var slug, name, prefix, description string
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("slug").Title("slug").
			Description("URL slug — a-z 0-9 - (immutable)").Value(&slug).Validate(validateProjectSlug),
		huh.NewInput().Key("name").Title("name").
			Description("Project display name").Value(&name).Validate(nonEmpty),
		huh.NewInput().Key("prefix").Title("prefix").
			Description("Issue-key prefix — 2-6 A-Z 0-9 (immutable)").Value(&prefix).Validate(validateProjectPrefix),
		huh.NewInput().Key("description").Title("description").
			Description("Optional").Value(&description),
	))
}
