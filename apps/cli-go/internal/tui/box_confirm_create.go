package tui

// box_confirm_create.go — DD2-93: y/n-Bestätigung VOR der Anlage neuer Entitäten
// bzw. vor riskanten Settings-Änderungen. Nach dem Ausfüllen eines Create-Formulars
// (Issue/Sprint/Meilenstein/Memory/Tag) öffnet sich ein Confirm-Modal statt sofort
// anzulegen; erst y feuert den bereits aus den Formularwerten gebauten Cmd. Edit-/
// Update-Formulare (editField/tagEdit) laufen ohne Prompt durch — Ausnahme
// project_settings (DD2-232): slug/prefix-Änderung ist konsequenzreich genug
// (Routing/Bookmarks bzw. Issue-Key-Darstellung), daher immer confirm-gated.

import (
	"strconv"
	"strings"

	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

// isCreateKind meldet, ob ein Formular-Kind vor dem Ausführen einen y/n-Confirm
// braucht — neue Entität ODER (DD2-232) die riskante Projekt-Settings-Änderung.
func isCreateKind(kind string) bool {
	switch kind {
	case "issue", "milestone", "sprint", "memory", "tagCreate", "userStoryAdd", "dodAdd", "project_create", "project_settings":
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
		// DD2-190: Issue-Eingaben sichern, damit n/esc am Confirm befüllt ins
		// Create-Form zurückkehrt statt die Arbeit zu verwerfen. Vor dem Nullen
		// von m.form lesen (currentIssueDraft braucht die offene Form).
		if m.formKind == "issue" {
			d := m.currentIssueDraft()
			m.createDraft = &d
		}
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
	case "dodAdd":
		return "DoD item: " + get("dod_label")
	case "project_create":
		return "Project: " + get("name") + " (" + get("prefix") + ")"
	case "project_settings": // DD2-232: Impact-Vorschau bei slug/prefix-Änderung
		name, slug, prefix := get("name"), get("slug"), get("prefix")
		label := "Project: " + name + " (" + slug + " / " + prefix + ")"
		if m.project != nil && (slug != m.project.Slug || prefix != m.project.Prefix) {
			label += " — affects " + strconv.Itoa(m.project.BacklogCount) + " issues, " +
				strconv.Itoa(m.project.SprintCount) + " sprints (keys update instantly, no rewrite)"
		}
		return label
	}
	return "new entity"
}

// keyCreateConfirm steuert den Prompt: enter legt an, n/esc verwirft (DD2-174).
func (m model) keyCreateConfirm(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch {
	case keybind.Matches(msg, keys.Enter):
		cmd := m.pendingCreate
		m.createConfirm = false
		m.pendingCreate = nil
		m.createLabel = ""
		m.createDraft = nil // DD2-190: Draft verbraucht — kein Reopen nach Anlage
		m.status = noticeText("Creating …")
		return m, cmd
	case keybind.Matches(msg, keys.Back), msg.String() == "n":
		m.createConfirm = false
		m.pendingCreate = nil
		m.createLabel = ""
		// DD2-190: n/esc verwirft die Issue-Arbeit nicht — zurück ins befüllte
		// Create-Form (gesicherter Draft). Andere Create-Kinds: bisheriger Abbruch.
		if m.createDraft != nil {
			d := *m.createDraft
			m.createDraft = nil
			return m.openIssueFormWithDraft(d)
		}
		m.status = noticeText("Create cancelled")
		return m, nil
	}
	return m, nil
}

// createConfirmBox rendert das Confirm-Modal (Mauve = konstruktiv, nicht destruktiv).
func (m model) createConfirmBox() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Create?") + "\n\n")
	b.WriteString(theme.Accent.Render(truncate(m.createLabel, 60)) + "\n\n")
	b.WriteString(theme.Dim.Render("enter: create   esc/n: back"))
	return modalBox(b.String(), clampModalWidth(54, m.width), theme.Mauve)
}
