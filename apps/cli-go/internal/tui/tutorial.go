package tui

// tutorial.go — geführtes, seitenweises Onboarding (DD2-122). Speist sich aus
// derselben zentralen Keymap wie Help (keys.helpGroups(), DD2-31/47) — kein
// Doppelpflege-Content. v1 = statische, blätterbare Seiten (kein interaktives
// Overlay-Onboarding, DECISION). Erreichbar über das Command-Center.

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
)

type tutorialPage struct {
	title string
	body  string
}

// tutorialPages baut die Tutorialseiten: Intro (jkli-Navigation) + je eine Seite
// pro Keymap-Gruppe (echte Key-Hints, Single-Source) + Abschluss.
func (m model) tutorialPages() []tutorialPage {
	pages := []tutorialPage{{
		title: "Welcome to the DevD Cockpit",
		body: "This TUI manages milestones, sprints, issues and reviews.\n\n" +
			"Navigation uses the jkli direction cross:\n" +
			"  i = up    k = down    j = left / back    l = right / in\n" +
			"Arrow keys are equivalent everywhere.\n\n" +
			"l / → / ctrl+l: next page    j / ← / ctrl+j: previous    esc / q: leave",
	}}
	for _, g := range keys.helpGroups() {
		var b strings.Builder
		for _, bind := range g.bindings {
			h := bind.Help()
			b.WriteString(theme.Header.Render(h.Key) + "  " + theme.Dim.Render(h.Desc) + "\n")
		}
		pages = append(pages, tutorialPage{title: g.title, body: strings.TrimRight(b.String(), "\n")})
	}
	pages = append(pages, tutorialPage{
		title: "You're ready",
		body: "That's the tour.\n\n" +
			"• Open the command center for actions and 'Go to:' navigation.\n" +
			"• Press ? anytime for the full shortcut reference.\n" +
			"• Use / to search within the tree, or the Search view for all issues.\n\n" +
			"esc / q closes the tutorial.",
	})
	return pages
}

// openTutorial öffnet das Tutorial auf Seite 1 und merkt sich die Heimat-View.
func (m model) openTutorial() (tea.Model, tea.Cmd) {
	if m.view == viewTree || m.view == viewColumns {
		m.topReturn = m.view
	}
	m.tutorialPage = 0
	m.view = viewTutorial
	m.status = ""
	return m, nil
}

// keyTutorial blättert die Seiten (l/→/ctrl+l/k vor, j/←/ctrl+j/i zurück) und
// verlässt das Tutorial (esc/q → topReturn). g/G springt an Anfang/Ende.
// DD2-174: explizite Next/Prev sind ctrl+l/ctrl+j (vorher space/p) — space frei.
func (m model) keyTutorial(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	n := len(m.tutorialPages())
	switch msg.String() {
	case "esc", "q":
		m.view = m.topReturn
		m.status = ""
		return m, nil
	case "g", "home":
		m.tutorialPage = 0
		return m, nil
	case "G", "end":
		m.tutorialPage = n - 1
		return m, nil
	case "ctrl+l":
		if m.tutorialPage < n-1 {
			m.tutorialPage++
		}
		return m, nil
	case "ctrl+j":
		if m.tutorialPage > 0 {
			m.tutorialPage--
		}
		return m, nil
	}
	switch navKey(msg.String()) {
	case "right", "down":
		if m.tutorialPage < n-1 {
			m.tutorialPage++
		}
	case "left", "up":
		if m.tutorialPage > 0 {
			m.tutorialPage--
		}
	}
	return m, nil
}

func (m model) viewTutorial() string {
	pages := m.tutorialPages()
	if m.tutorialPage < 0 {
		m.tutorialPage = 0
	}
	if m.tutorialPage >= len(pages) {
		m.tutorialPage = len(pages) - 1
	}
	p := pages[m.tutorialPage]
	w := m.termWidth()

	head := m.header() + "\n" + theme.Header.Render(m.screenTitle("Tutorial"))
	title := theme.Accent.Render(p.title)
	body := wrapText(p.body, min(w-4, 76))
	nav := theme.Dim.Render(fmt.Sprintf("Page %d/%d   l/→/ctrl+l: next   j/←/ctrl+j: back   g/G: first/last   esc/q: close",
		m.tutorialPage+1, len(pages)))
	return head + "\n\n" + title + "\n\n" + body + "\n\n" + nav
}
