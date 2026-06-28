package tui

import (
	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// buildMilestoneForm konstruiert das keyed Meilenstein-Create-Formular.
// tags (optional) ergänzt ein Multiselect, damit Tags direkt beim Anlegen gesetzt
// werden (DD2-33). Leere Tag-Liste → Feld entfällt (kein leeres Multiselect).
func buildMilestoneForm(milestones []api.Milestone, tags []api.Tag) *huh.Form {
	_ = milestones // Meilenstein-Form braucht keine Meilenstein-Liste (Signatur-Parität)
	fields := []huh.Field{
		huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
		huh.NewText().Key("description").Title("Beschreibung (optional)"),
		huh.NewInput().Key("target_date").Title("Zieldatum (optional, YYYY-MM-DD)"),
	}
	if len(tags) > 0 {
		fields = append(fields, tagMultiSelect(tags))
	}
	return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
}
