package tui

import "github.com/charmbracelet/huh"

// buildResultForm konstruiert das keyed Ergebnis-Create-Formular.
func buildResultForm() *huh.Form {
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("outcome_summary").Title("Ergebnis-Summary (Pflicht)").Validate(nonEmpty),
		huh.NewSelect[string]().Key("outcome_type").Title("Typ").Options(
			huh.NewOption("feat", "feat"),
			huh.NewOption("fix", "fix"),
			huh.NewOption("refactor", "refactor"),
			huh.NewOption("chore", "chore"),
			huh.NewOption("docs", "docs"),
		),
		huh.NewInput().Key("commits").Title("Commits (Komma-getrennt, optional)"),
		huh.NewText().Key("vorgehen").Title("Vorgehen (optional, Markdown)"),
	)).WithWidth(58).WithShowHelp(true)
}
