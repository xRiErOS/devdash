package tui

// form_sandbox.go — Styling-Sandbox (Palette-Action "Test Form"): eine huh-Form
// mit allen vier Feldtypen (text/textarea/select/multiselect) OHNE Persistenz.
// War die Iterations-Fläche für die Form-Optik; jetzt Archetyp. Theme + Box-Chrome
// sind nach forms_shared.go promotet (paletteFormTheme/styleForm/formChrome) und
// gelten für ALLE embedded Forms — diese Datei hält nur noch den Sandbox-Builder.

import "github.com/charmbracelet/huh"

// buildTestForm liefert die Sandbox-Form mit allen vier Feldtypen (kein Persist).
// Theme/Maße/Chrome kommen zentral über styleForm + formChrome (openForm-Pfad).
func buildTestForm() *huh.Form {
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("text").Title("Text").Placeholder("einzeiliger Input"),
		huh.NewText().Key("textarea").Title("Textarea").Placeholder("mehrzeiliger Text"),
		huh.NewSelect[string]().Key("select").Title("Select").Options(
			huh.NewOption("Feature", "feature"),
			huh.NewOption("Bug", "bug"),
			huh.NewOption("Improvement", "improvement"),
			huh.NewOption("Core", "core"),
		),
		huh.NewMultiSelect[string]().Key("multiselect").Title("Multiselect").Options(
			huh.NewOption("frontend", "1"),
			huh.NewOption("backend", "2"),
			huh.NewOption("tui", "3"),
			huh.NewOption("docs", "4"),
		),
	))
}
