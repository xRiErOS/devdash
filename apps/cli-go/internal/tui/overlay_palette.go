package tui

// overlay_palette.go — Command-Center (T16): globales Action-Palette-Modal, von überall
// per ctrl+k / shift+k öffenbar. Fuzzy-Filter über die Aktionsliste, Auswahl
// dispatcht entweder einen View-Wechsel oder öffnet ein huh-Create-Formular.

import (
	"strings"

	"devd-cli/internal/theme"
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
		{"create_milestone", "Create new milestone"},
		{"create_sprint", "Create new sprint"},
		{"create_memory", "Create new memory"},
		{"go_reviews", "Go to: Open reviews"},
		{"go_memory", "Go to: Memory browser"},
		{"go_sstd", "Go to: SSTD slots"},          // DD2-166
		{"go_notes", "Go to: User notes"},         // DD2-168
		{"go_search", "Go to: Search all issues"}, // DD2-91
		{"go_backlog", "Go to: Backlog"},
		{"go_tags", "Go to: Tag manager"},
		{"go_settings", "Settings"},              // DD2-125: edit user config
		{"go_tutorial", "Tutorial: guided tour"}, // DD2-122
		{"test_form", "Test Form"},               // Styling-Sandbox (kein Persist)
	}
	if m.global != nil {
		acts = append(acts, paletteAction{"go_project", "Switch project"})
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
	case "go_memory":
		return m.openMemory()
	case "go_sstd": // DD2-166: SSTD-Slots-Browser
		return m.openSSTD()
	case "go_notes": // DD2-168: User-Notes-Browser
		return m.openUserNotes()
	case "go_search": // DD2-91: projektweite Issue-Suche
		return m.openSearch()
	case "go_tutorial": // DD2-122: geführtes Onboarding
		return m.openTutorial()
	case "go_backlog":
		m.view = viewBrowseBacklog
		return m, loadBacklog(m.client)
	case "go_tags":
		return m.openTagManager()
	case "go_project":
		if m.global != nil {
			return m.openProjPick() // DD2-124: Picker-Overlay
		}
	case "create_issue":
		return m.openForm("issue")
	case "create_milestone":
		return m.openForm("milestone")
	case "create_sprint":
		return m.openForm("sprint")
	case "create_memory":
		return m.openForm("memory")
	case "go_settings": // DD2-125: Settings-Form öffnen
		return m.openForm("settings")
	case "test_form":
		return m.openForm("testform")
	}
	return m, nil
}

// paletteBox rendert das schwebende Command-Center-Modal.
func (m model) paletteBox() string {
	acts := m.palFiltered()
	body := theme.Accent.Render("> ") + m.palQuery + "▏\n"
	body += theme.Dim.Render(strings.Repeat("─", 44)) + "\n"
	if len(acts) == 0 {
		body += theme.Dim.Render("(no matches)") + "\n"
	}
	body += menuList(len(acts), m.palList.cursor, func(i int, sel bool) string {
		label := acts[i].label
		if sel {
			label = theme.Header.Render(label)
		}
		return label
	})
	return modalPanel("Command-Center", body, "type: filter   ↑↓: select   enter: run   esc: close", clampModalWidth(48, m.width), theme.Mauve)
}
