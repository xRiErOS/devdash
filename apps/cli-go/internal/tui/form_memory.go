package tui

import "github.com/charmbracelet/huh"

// buildMemoryForm konstruiert das keyed Memory-Create-Formular.
func buildMemoryForm() *huh.Form {
	return huh.NewForm(huh.NewGroup(
		huh.NewSelect[string]().Key("category").Title("Kategorie").Options(
			huh.NewOption("Architektur-Entscheidung", "architecture_decision"),
			huh.NewOption("Sackgasse / Dead-End", "dead_end"),
			huh.NewOption("Bug-Muster", "bug_pattern"),
			huh.NewOption("Konvention", "convention"),
			huh.NewOption("Externer Zwang", "external_constraint"),
			huh.NewOption("Session-Notiz", "session_note"),
		),
		huh.NewInput().Key("summary").Title("Summary (Pflicht, max 500)").Validate(nonEmpty),
		huh.NewText().Key("content").Title("Inhalt (optional)"),
		huh.NewInput().Key("anchor").Title("Anchor (optional, z.B. d01)"),
	)).WithWidth(58).WithShowHelp(true)
}
