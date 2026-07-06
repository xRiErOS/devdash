package tui

// form_edit_project.go — DD2-221/DD2-232: Projekt-Settings-Form. Über die Command
// Palette ("Project settings") erreichbar (overlay_palette.go → openForm
// ("project_settings")). name/slug/prefix sind editierbar (DD2-232 — vormals
// slug/prefix read-only). Keys werden serverseitig live aus prefix+project_number
// berechnet (nie in der DB dupliziert) — ein Prefix-/Slug-Wechsel braucht darum
// KEINEN Key-Rewrite, nur das eine PUT (Backend validiert Format/Uniqueness/
// Reserved-Slug, s. api.js). Submit läuft über den y/n-Confirm mit Impact-Vorschau
// (box_confirm_create.go, isCreateKind("project_settings")) statt sofort zu speichern.
// Format-Validierung hier spiegelt projectSlug/projectPrefix (packages/api-types/
// project.contracts.js) — Single-Source bleibt der Backend-Contract.

import (
	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// buildProjectSettingsForm baut die Projekt-Settings-Form, vorbelegt mit dem
// aktiven Projekt. Alle drei Felder editierbar (DD2-232); slug/prefix-Validierung
// per validateProjectSlug/validateProjectPrefix (Single Source mit form_create_
// project.go, gleiches Format wie der Backend-Contract). Gelesen wird der Wert
// nach Abschluss per keyed GetString (forms_shared-Konvention).
func buildProjectSettingsForm(p *api.Project) *huh.Form {
	name, slug, prefix := "", "", ""
	if p != nil {
		name, slug, prefix = p.Name, p.Slug, p.Prefix
	}
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("name").Title("name").
			Description("Project display name").Value(&name).Validate(nonEmpty),
		huh.NewInput().Key("slug").Title("slug").
			Description("a-z 0-9 - · drives routing/MCP-lookup — changing it can break bookmarks").
			Value(&slug).Validate(validateProjectSlug),
		huh.NewInput().Key("prefix").Title("prefix").
			Description("2-6 A-Z 0-9 · drives issue keys (e.g. DD2-7) — keys update live, no rewrite").
			Value(&prefix).Validate(validateProjectPrefix),
	))
}
