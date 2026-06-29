package tui

// confirm_create.go — DD2-93: y/n-Bestätigung VOR der Anlage neuer Entitäten.
// Nach dem Ausfüllen eines Create-Formulars (Issue/Sprint/Meilenstein/Memory/Tag)
// öffnet sich ein Confirm-Modal statt sofort anzulegen; erst y feuert den bereits
// aus den Formularwerten gebauten Cmd. Edit-/Update-Formulare (editField/tagEdit/
// result) laufen ohne Prompt durch (keine neue Entität).

import (
	"strings"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

// isCreateKind meldet, ob ein Formular-Kind eine NEUE Entität anlegt (→ Confirm).
func isCreateKind(kind string) bool {
	switch kind {
	case "issue", "milestone", "sprint", "memory", "tagCreate", "userStoryAdd":
		return true
	}
	return false
}

// submitForm wird bei Formular-Abschluss (alt+enter / huh.StateCompleted) aufgerufen.
// Es baut den Create-/Update-Cmd aus den noch gesetzten Formularwerten. Für
// Create-Kinds parkt es den Cmd und öffnet das Confirm-Modal; Edits feuern direkt.
func (m model) submitForm() (tea.Model, tea.Cmd) {
	createCmd := m.formCreateCmd() // liest die Formularwerte JETZT (vor dem Nullen)
	confirm := isCreateKind(m.formKind)
	if confirm {
		m.createLabel = m.createConfirmLabel()
		m.pendingCreate = createCmd
		m.createConfirm = true
	}
	m.form = nil
	m.formKind = ""
	m.formGroupIdx = 0
	m.formGroupTitles = nil
	m.formPartials = nil
	if confirm {
		return m, nil // auf y/n warten
	}
	return m, createCmd
}

// createConfirmLabel beschreibt die anzulegende Entität fürs Modal (Typ + Name/Titel).
func (m *model) createConfirmLabel() string {
	get := func(k string) string { return strings.TrimSpace(m.form.GetString(k)) }
	switch m.formKind {
	case "issue":
		typ := m.form.GetString("type")
		if typ == "" {
			typ = "feature"
		}
		return "Issue (" + typ + "): " + get("title")
	case "milestone":
		return "Milestone: " + get("name")
	case "sprint":
		return "Sprint: " + get("name")
	case "memory":
		return "Memory: " + get("summary")
	case "tagCreate":
		return "Tag: " + get("name")
	case "userStoryAdd":
		return "User story: " + get("us_title")
	}
	return "new entity"
}

// keyCreateConfirm steuert den y/n-Prompt: y/enter legt an, n/esc/q verwirft.
func (m model) keyCreateConfirm(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "enter":
		cmd := m.pendingCreate
		m.createConfirm = false
		m.pendingCreate = nil
		m.createLabel = ""
		m.status = noticeText("Creating …")
		return m, cmd
	case "n", "esc", "q":
		m.createConfirm = false
		m.pendingCreate = nil
		m.createLabel = ""
		m.status = noticeText("Anlage abgebrochen")
		return m, nil
	}
	return m, nil
}

// createConfirmBox rendert das Confirm-Modal (Mauve = konstruktiv, nicht destruktiv).
func (m model) createConfirmBox() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Anlegen?") + "\n\n")
	b.WriteString(theme.Accent.Render(truncate(m.createLabel, 60)) + "\n\n")
	b.WriteString(theme.Dim.Render("y/enter: anlegen   n/esc: zurück"))
	return modalBox(b.String(), clampModalWidth(54, m.width), theme.Mauve)
}
