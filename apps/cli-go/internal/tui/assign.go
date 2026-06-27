package tui

// assign.go — Sprint↔Meilenstein-Zuweisung (T03).
//   Flow A: m in Sprint-Details → Single-Select-Picker (Meilenstein wählen / lösen).
//   Flow B: a in Meilenstein-Detail → Checkliste der Sprints ohne Meilenstein,
//           mehrere ankreuzen, enter hängt alle an den Meilenstein.

import (
	"fmt"
	"strings"

	"devd-cli/internal/theme"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// smOpt ist eine Picker-Option (id=nil → „kein Meilenstein").
type smOpt struct {
	id    *int
	label string
}

// --- Flow A: Sprint → Meilenstein (Single-Select) ---

func (m *model) milestonePickOpts() []smOpt {
	opts := []smOpt{{nil, "(kein Meilenstein — lösen)"}}
	// DD2-27: nur offene/aktive Meilensteine als Zuweisungsziel — geschlossene/
	// stornierte taugen nicht und verwässern den Picker (analog Sprint-Create-Form).
	for _, ms := range openMilestones(m.milestones) {
		id := ms.ID
		opts = append(opts, smOpt{&id, ms.Name + theme.Dim.Render(" ("+ms.Status+")")})
	}
	return opts
}

// openSprintMilestone öffnet den Meilenstein-Picker für einen Sprint (Flow A).
func (m model) openSprintMilestone(sprintID int) (tea.Model, tea.Cmd) {
	m.smPick = true
	m.smSprintID = sprintID
	m.smMenu = listState{}
	m.smOpts = m.milestonePickOpts()
	m.smMenu.setLen(len(m.smOpts))
	m.status = ""
	return m, nil
}

func (m model) keySprintMilestone(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.smMenu.move(-1)
		return m, nil
	case "down":
		m.smMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "m":
		m.smPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.smPick = false
		if m.smMenu.cursor < 0 || m.smMenu.cursor >= len(m.smOpts) {
			return m, nil
		}
		opt := m.smOpts[m.smMenu.cursor]
		m.status = "Sprint → Meilenstein …"
		return m, doSetSprintMilestone(m.client, m.smSprintID, opt.id)
	}
	return m, nil
}

func (m model) sprintMilestoneMenu() string {
	var b strings.Builder
	b.WriteString(theme.Header.Render("Sprint einem Meilenstein zuweisen") + "\n")
	b.WriteString(theme.Dim.Render("enter: setzen   esc: abbrechen") + "\n\n")
	for i, o := range m.smOpts {
		cursor := "  "
		label := o.label
		if i == m.smMenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(o.label)
		}
		b.WriteString(cursor + label + "\n")
	}
	return lipgloss.NewStyle().
		Width(48).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}

// --- Flow B: Meilenstein → Sprints (Multi-Select-Checkliste) ---

// openMilestoneAssign öffnet die Sprint-Checkliste für den fokussierten
// Meilenstein und lädt die unzugewiesenen Sprints (Flow B).
func (m model) openMilestoneAssign() (tea.Model, tea.Cmd) {
	ms := m.selMilestone()
	if ms == nil {
		return m, nil
	}
	m.maPick = true
	m.maMilestoneID = ms.ID
	m.maSprints = nil
	m.maChecked = map[int]bool{}
	m.maMenu = listState{}
	m.status = ""
	return m, loadUnassignedSprints(m.client)
}

func (m model) keyMilestoneAssign(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.maMenu.move(-1)
		return m, nil
	case "down":
		m.maMenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "a":
		m.maPick = false
		m.status = ""
		return m, nil
	case " ", "x":
		if m.maMenu.cursor >= 0 && m.maMenu.cursor < len(m.maSprints) {
			id := m.maSprints[m.maMenu.cursor].ID
			m.maChecked[id] = !m.maChecked[id]
		}
		return m, nil
	case "enter":
		var ids []int
		for _, s := range m.maSprints {
			if m.maChecked[s.ID] {
				ids = append(ids, s.ID)
			}
		}
		m.maPick = false
		if len(ids) == 0 {
			m.status = noticeText("Keine Sprints angekreuzt")
			return m, nil
		}
		m.status = fmt.Sprintf("%d Sprint(s) → Meilenstein …", len(ids))
		return m, doAssignSprintsToMilestone(m.client, ids, m.maMilestoneID)
	}
	return m, nil
}

func (m model) milestoneAssignMenu() string {
	var b strings.Builder
	name := ""
	if ms := m.selMilestone(); ms != nil {
		name = ms.Name
	}
	b.WriteString(theme.Header.Render("Sprints zuweisen → "+truncate(name, 28)) + "\n")
	b.WriteString(theme.Dim.Render("space: an/aus   enter: zuweisen   esc: abbrechen") + "\n\n")
	if len(m.maSprints) == 0 {
		b.WriteString(theme.Dim.Render("(keine Sprints ohne Meilenstein — oder lädt …)") + "\n")
	}
	for i, s := range m.maSprints {
		box := theme.Dim.Render("[ ]")
		if m.maChecked[s.ID] {
			box = theme.Accent.Render("[x]")
		}
		cursor := "  "
		label := fmt.Sprintf("%-9s %s", s.Key, truncate(s.Name, 26))
		if i == m.maMenu.cursor {
			cursor = theme.Accent.Render("▸ ")
			label = theme.Header.Render(label)
		}
		b.WriteString(cursor + box + " " + label + "\n")
	}
	return lipgloss.NewStyle().
		Width(50).
		Border(lipgloss.RoundedBorder()).BorderForeground(theme.Mauve).
		Background(theme.Base).Padding(0, 1).
		Render(b.String())
}
