package tui

// form_edit_userstory.go — huh-Form zum Anlegen/Bearbeiten einer User-Story aus dem
// Detail-Fokus (DD2-144). Zwei Felder: Title (Pflicht) + QA (Akzeptanzkriterium,
// D09). Vanilla huh, Werte werden nach StateCompleted keyed gelesen (us_title/us_qa),
// nicht per Pointer (Value-Copy-Bruch) — Preset-Binding nur für den Initialwert.
//
// T04b/G2 (Welle 4, D16): Das Anlegen einer User Story hier ist die Vorbedingung für
// die Sprint-Zuweisung — der Backend-Gate (canAssignSprint, PATCH …/sprint) lehnt eine
// Zuweisung ohne >=1 User Story mit 422 ab. Der TUI-Assign-Flow surfaced diesen Gate
// aktuell nicht eigenständig (Backend ist die erzwingende Instanz); Fehler kommen als
// Toast aus der API-Antwort zurück.

import (
	"strconv"
	"strings"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
)

// buildUserStoryForm baut die Add-/Edit-Form, mit Titel/QA vorbelegt.
func buildUserStoryForm(title, qa string) *huh.Form {
	t, q := title, qa
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("us_title").Title("Title").Value(&t).Validate(nonEmpty),
		huh.NewText().Key("us_qa").Title("QA (action → expected result)").Value(&q),
	))
}

// openUserStoryForm öffnet die US-Form für das fokussierte Issue. f.key == "us:new"
// → Neuanlage; "us:<id>" → die bestehende Story (Titel/QA vorbelegt) bearbeiten.
func (m model) openUserStoryForm(it api.Issue, f detailField) (tea.Model, tea.Cmd) {
	m.usFormIssueID = it.ID
	m.status = ""
	if f.key == "us:new" {
		m.usFormID = 0
		m.formKind = "userStoryAdd"
		m.form = m.styleForm(buildUserStoryForm("", ""))
		return m, m.form.Init()
	}
	id, _ := strconv.Atoi(strings.TrimPrefix(f.key, "us:"))
	m.usFormID = id
	var title, qa string
	for _, us := range it.UserStories {
		if us.ID == id {
			title, qa = us.Title, deref(us.QA)
			break
		}
	}
	m.formKind = "userStoryEdit"
	m.form = m.styleForm(buildUserStoryForm(title, qa))
	return m, m.form.Init()
}
