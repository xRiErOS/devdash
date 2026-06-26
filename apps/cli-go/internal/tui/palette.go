package tui

// palette.go — Command-Center (T16): globales Action-Palette-Modal, von überall
// per ctrl+k / shift+k öffenbar. Fuzzy-Filter über die Aktionsliste, Auswahl
// dispatcht entweder einen View-Wechsel oder öffnet ein huh-Create-Formular.

import (
	"strings"

	"devd-cli/internal/theme"
	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
)

// paletteAction ist ein wählbarer Eintrag im Command-Center.
type paletteAction struct {
	id    string
	label string
}

// paletteActions liefert die kontextabhängige Aktionsliste. Reviews (T17) und
// Memory (T18) werden hier ergänzt, sobald die Views existieren.
func paletteActions(m *model) []paletteAction {
	acts := []paletteAction{
		{"create_issue", "Neues Issue anlegen"},
		{"create_milestone", "Neuen Meilenstein anlegen"},
		{"create_sprint", "Neuen Sprint anlegen"},
		{"go_reviews", "Gehe zu: Offene Reviews"},
		{"go_backlog", "Gehe zu: Backlog"},
	}
	if m.global != nil {
		acts = append(acts, paletteAction{"go_project", "Projekt wechseln"})
	}
	return acts
}

// fuzzyMatch prüft, ob query als Subsequenz (case-insensitiv) in target steckt.
// Leere query matcht alles. Rune-basiert (Umlaut-sicher).
func fuzzyMatch(query, target string) bool {
	q := []rune(strings.ToLower(query))
	t := []rune(strings.ToLower(target))
	i := 0
	for _, tc := range t {
		if i < len(q) && tc == q[i] {
			i++
		}
	}
	return i == len(q)
}

// palFiltered liefert die per palQuery gefilterten Aktionen.
func (m *model) palFiltered() []paletteAction {
	all := paletteActions(m)
	if m.palQuery == "" {
		return all
	}
	out := make([]paletteAction, 0, len(all))
	for _, a := range all {
		if fuzzyMatch(m.palQuery, a.label) {
			out = append(out, a)
		}
	}
	return out
}

// openPalette öffnet das Command-Center mit leerem Filter.
func (m model) openPalette() (tea.Model, tea.Cmd) {
	m.paletteOpen = true
	m.palQuery = ""
	m.palList = listState{}
	m.palList.setLen(len(m.palFiltered()))
	m.status = ""
	return m, nil
}

// keyPalette behandelt Tastatur im Command-Center. j/k tippen in den Filter —
// Navigation läuft daher ausschließlich über Pfeiltasten.
func (m model) keyPalette(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc, tea.KeyCtrlC:
		m.paletteOpen = false
		return m, nil
	case tea.KeyUp:
		m.palList.move(-1)
		return m, nil
	case tea.KeyDown:
		m.palList.move(1)
		return m, nil
	case tea.KeyEnter:
		acts := m.palFiltered()
		if m.palList.cursor >= 0 && m.palList.cursor < len(acts) {
			m.paletteOpen = false
			return m.dispatchPalette(acts[m.palList.cursor].id)
		}
		return m, nil
	case tea.KeyBackspace:
		if len(m.palQuery) > 0 {
			r := []rune(m.palQuery)
			m.palQuery = string(r[:len(r)-1])
			m.palList.setLen(len(m.palFiltered()))
		}
		return m, nil
	case tea.KeyRunes, tea.KeySpace:
		m.palQuery += string(msg.Runes)
		m.palList.setLen(len(m.palFiltered()))
		return m, nil
	}
	return m, nil
}

// dispatchPalette führt die gewählte Aktion aus (View-Wechsel oder Formular).
func (m model) dispatchPalette(id string) (tea.Model, tea.Cmd) {
	switch id {
	case "go_reviews":
		return m.openReviewsList()
	case "go_backlog":
		m.view = viewBacklog
		return m, loadBacklog(m.client)
	case "go_project":
		if m.global != nil {
			m.view = viewPicker
			return m, loadProjects(m.global)
		}
	case "create_issue":
		return m.openForm("issue")
	case "create_milestone":
		return m.openForm("milestone")
	case "create_sprint":
		return m.openForm("sprint")
	}
	return m, nil
}

// paletteBox rendert das schwebende Command-Center-Modal.
func (m model) paletteBox() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Command-Center") + "\n")
	b.WriteString(theme.Accent.Render("> ") + m.palQuery + "▏\n")
	b.WriteString(theme.Dim.Render(strings.Repeat("─", 44)) + "\n")
	acts := m.palFiltered()
	if len(acts) == 0 {
		b.WriteString(theme.Dim.Render("(keine Treffer)") + "\n")
	}
	for i, a := range acts {
		cursor := "  "
		label := a.label
		if i == m.palList.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(label)
		}
		b.WriteString(cursor + label + "\n")
	}
	b.WriteString("\n" + theme.Dim.Render("tippen: filtern   ↑↓: wählen   enter: ausführen   esc: zu"))
	return lipgloss.NewStyle().
		Width(48).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}
