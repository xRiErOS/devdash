package tui

import (
	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// buildIssueForm konstruiert das keyed Issue-Create-Formular (vanilla huh).
// tags (optional) ergänzt ein Multiselect (DD2-33).
func buildIssueForm(tags []api.Tag) *huh.Form {
	fields := []huh.Field{
		huh.NewInput().Key("title").Title("Titel").Validate(nonEmpty),
		huh.NewText().Key("description").Title("Beschreibung (optional)"),
		huh.NewSelect[string]().Key("type").Title("Typ").Options(typeOptions()...),
		huh.NewText().Key("user_stories").Title("User-Stories (optional, eine pro Zeile)"),
	}
	if len(tags) > 0 {
		fields = append(fields, tagMultiSelect(tags))
	}
	return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
}
