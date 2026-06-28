package tui

import "github.com/charmbracelet/huh"

// buildRejectForm konstruiert das mehrzeilige Reject-Kommentar-Modal (DD2-119,
// US-50). Ersetzt die einzeilige Footer-Eingabe (m.inputting/keyReviewInput).
// not_passed verlangt einen Kommentar (Backend-Gate) → Validate(nonEmpty).
//
// US-51 (Screenshot/Anhang) ist bewusst NICHT enthalten: cli-go hat keinen
// Attachment-Upload-Client, und ein Pfad-Eingabefeld ohne funktionierenden
// Upload wäre irreführend. Terminal-Feasibility geprüft — eine Pfad-Eingabe ist
// machbar, braucht aber einen eigenen multipart-Upload-Client (api) gegen das
// vorhandene backlog_attachments-Backend; eigener Pfad/Task (im result vermerkt).
func buildRejectForm() *huh.Form {
	return huh.NewForm(huh.NewGroup(
		huh.NewText().Key("comment").Title("Reject comment (required)").Validate(nonEmpty),
	))
}
