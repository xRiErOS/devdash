package tui

// form_edit_dod.go — huh-Form zum Anlegen/Bearbeiten eines DoD-Items (Definition of
// Done) aus dem Meilenstein-Detail-Fokus (DD2-270). Zwei Felder: Label (Pflicht) +
// Done (Confirm). Mirror von form_edit_userstory.go (US-412: "wie User-Stories
// bearbeiten") — Anlage über "dod:new", Bearbeiten über "dod:<id>", Werte nach
// StateCompleted keyed gelesen (dod_label/dod_done), nicht per Pointer-Binding.

import (
	"strconv"
	"strings"

	"devd-cli/internal/api"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
)

// buildDodForm baut die Add-/Edit-Form, mit Label/Done vorbelegt.
func buildDodForm(label string, done bool) *huh.Form {
	l, d := label, done
	return huh.NewForm(huh.NewGroup(
		huh.NewInput().Key("dod_label").Title("Label").Value(&l).Validate(nonEmpty),
		huh.NewConfirm().Key("dod_done").Title("Done").Value(&d),
	))
}

// openDodForm öffnet die DoD-Form für den fokussierten Meilenstein. f.key == "dod:new"
// → Neuanlage; "dod:<id>" → das bestehende Item (Label/Done vorbelegt) bearbeiten.
func (m model) openDodForm(ms api.Milestone, f detailField) (tea.Model, tea.Cmd) {
	m.dodFormMilestoneID = ms.ID
	m.status = ""
	if f.key == "dod:new" {
		m.dodFormID = 0
		m.formKind = "dodAdd"
		m.form = m.styleForm(buildDodForm("", false))
		return m, m.form.Init()
	}
	id, _ := strconv.Atoi(strings.TrimPrefix(f.key, "dod:"))
	m.dodFormID = id
	var label string
	var done bool
	for _, it := range m.dodCache[ms.ID] {
		if it.ID == id {
			label, done = it.Label, it.Done
			break
		}
	}
	m.formKind = "dodEdit"
	m.form = m.styleForm(buildDodForm(label, done))
	return m, m.form.Init()
}
