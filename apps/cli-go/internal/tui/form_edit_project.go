package tui

// form_edit_project.go — DD2-221: Projekt-Settings-Form. Über die Command Palette
// ("Project settings") erreichbar (overlay_palette.go → openForm("project_settings")).
// Editierbar ist nur der Projekt-Name; slug und prefix werden read-only angezeigt:
// das Backend (PUT /api/projects/:id) erlaubt sie nicht als writable, und prefix
// treibt die Issue-Keys (DD2-n) — ein Wechsel würde die Identität/FK-Integrität
// brechen (eigenes, riskantes Migrations-Feature, hier out of scope).

import (
	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// buildProjectSettingsForm baut die Projekt-Settings-Form, vorbelegt mit dem
// aktiven Projekt. name = editierbar (Pflicht); slug/prefix = read-only Notes.
// Gelesen wird der Wert nach Abschluss per keyed GetString (forms_shared-Konvention).
func buildProjectSettingsForm(p *api.Project) *huh.Form {
	name := ""
	slug, prefix := "—", "—"
	if p != nil {
		name = p.Name
		if p.Slug != "" {
			slug = p.Slug
		}
		if p.Prefix != "" {
			prefix = p.Prefix
		}
	}
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("name").Title("name").
			Description("Project display name").Value(&name).Validate(nonEmpty),
		huh.NewNote().Title("slug").
			Description(slug+"  —  read-only (drives routing)"),
		huh.NewNote().Title("prefix").
			Description(prefix+"  —  read-only (drives issue keys)"),
	))
}
