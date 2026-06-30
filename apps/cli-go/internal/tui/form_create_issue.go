package tui

import (
	"devd-cli/internal/api"
	"github.com/charmbracelet/huh"
)

// issueDraft hält die Werte des Create-Issue-Formulars, damit sie einen Form-
// Neuaufbau überleben: n/esc am Anlege-Confirm baut das Formular befüllt neu
// (DD2-190) und der ctrl+e-Editor-Reseed erhält die übrigen Felder, während nur
// po_notes überschrieben wird (DD2-234). Zero-Value = leeres Formular.
type issueDraft struct {
	title       string
	poNotes     string
	typ         string
	userStories string
	priority    string   // "1".."5" (priorityOptions-Wert)
	tagIDs      []string // gewählte Tag-Option-Werte (Tag-IDs als String)
}

// buildIssueForm konstruiert das keyed Issue-Create-Formular (vanilla huh),
// vorbelegt aus d (DD2-190/234). Priority-Select (DD2-235) lässt den PO die
// Backlog-Priorität direkt beim Anlegen setzen. tags (optional) ergänzt ein
// Multiselect (DD2-33).
//
// Die Langtext-Felder schalten huh's eingebauten ctrl+e-Editor AUS
// (ExternalEditor(false)): er läuft über $EDITOR statt des konfigurierten
// Editors (DD2-233) und huh broadcastet sein updateValueMsg-Ergebnis an ALLE
// Text-Felder der Gruppe → po_notes-Inhalt blutet in user_stories (DD2-234).
// Der ctrl+e-Editor wird stattdessen in updateForm abgefangen (configuredEditor
// + gezielter po_notes-Reseed).
func buildIssueForm(tags []api.Tag, d issueDraft) *huh.Form {
	title, poNotes, stories := d.title, d.poNotes, d.userStories
	typ := d.typ
	if typ == "" {
		typ = "feature"
	}
	prio := d.priority
	if prio == "" {
		prio = "3" // Default P3 — Medium (PO passt beim Anlegen an)
	}
	fields := []huh.Field{
		huh.NewInput().Key("title").Title("Title").Value(&title).Validate(nonEmpty),
		huh.NewText().Key("po_notes").Title("PO-Notes (optional)").Value(&poNotes).ExternalEditor(false),
		huh.NewSelect[string]().Key("type").Title("Type").Options(typeOptions()...).Value(&typ),
		huh.NewSelect[string]().Key("priority").Title("Priority").Options(priorityOptions()...).Value(&prio),
		huh.NewText().Key("user_stories").Title("User stories (optional, one per line)").Value(&stories).ExternalEditor(false),
	}
	if len(tags) > 0 {
		fields = append(fields, tagMultiSelect(tags, d.tagIDs))
	}
	return huh.NewForm(huh.NewGroup(fields...)).WithWidth(58).WithShowHelp(true)
}
