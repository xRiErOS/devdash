package tui

import (
	"strconv"

	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// buildSprintForm konstruiert das keyed Sprint-Create-Formular. Das Meilenstein-
// Select listet nur offene/aktive Meilensteine (openMilestones, DD2-27) plus
// "(kein Meilenstein)". tags (optional) ergänzt ein Multiselect (DD2-33).
func buildSprintForm(milestones []api.Milestone, tags []api.Tag) *huh.Form {
	opts := []huh.Option[string]{huh.NewOption("(kein Meilenstein)", "")}
	for _, ms := range openMilestones(milestones) {
		opts = append(opts, huh.NewOption(ms.Name, strconv.Itoa(ms.ID)))
	}
	fields := []huh.Field{
		huh.NewInput().Key("name").Title("Name").Validate(nonEmpty),
		huh.NewText().Key("goal").Title("Goal (optional)"),
		huh.NewSelect[string]().Key("milestone_id").Title("Meilenstein").Options(opts...),
	}
	if len(tags) > 0 {
		fields = append(fields, tagMultiSelect(tags))
	}
	return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
}
