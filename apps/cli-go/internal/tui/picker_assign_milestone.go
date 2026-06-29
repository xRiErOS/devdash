package tui

// picker_assign_milestone.go — Sprint↔Meilenstein-Zuweisung (T03).
//   Flow A: a in Sprint-Details → Single-Select-Picker (Meilenstein wählen / lösen).
//   Flow B: a in Meilenstein-Detail → Checkliste der Sprints ohne Meilenstein,
//           mehrere ankreuzen, enter hängt alle an den Meilenstein.
//   DD2-174: Assign ist global a (vorher m für Flow A) — m entfällt.

import (
	"fmt"

	"devd-cli/internal/theme"
	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

// smOpt ist eine Picker-Option (id=nil → „kein Meilenstein").
type smOpt struct {
	id    *int
	label string
}

// --- Flow A: Sprint → Meilenstein (Single-Select) ---

func (m *model) milestonePickOpts() []smOpt {
	opts := []smOpt{{nil, "(no milestone — unset)"}}
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
	switch { // DD2-174: a (Assign) öffnet/schließt diesen Picker, m entfällt
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Assign), msg.String() == "q":
		m.smPick = false
		m.status = ""
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		m.smPick = false
		if m.smMenu.cursor < 0 || m.smMenu.cursor >= len(m.smOpts) {
			return m, nil
		}
		opt := m.smOpts[m.smMenu.cursor]
		m.status = "Sprint → milestone …"
		return m, doSetSprintMilestone(m.client, m.smSprintID, opt.id)
	}
	return m, nil
}

func (m model) sprintMilestoneMenu() string {
	body := theme.Dim.Render("enter: set   esc: cancel") + "\n\n"
	body += menuList(len(m.smOpts), m.smMenu.cursor, func(i int, sel bool) string {
		o := m.smOpts[i]
		label := o.label
		if sel {
			label = theme.Header.Render(o.label)
		}
		return label
	})
	return modalPanel("Assign sprint to a milestone", body, "", clampModalWidth(48, m.width), theme.Mauve)
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
	switch {
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Assign), msg.String() == "q":
		m.maPick = false
		m.status = ""
		return m, nil
	case keybind.Matches(msg, keys.Toggle):
		if m.maMenu.cursor >= 0 && m.maMenu.cursor < len(m.maSprints) {
			id := m.maSprints[m.maMenu.cursor].ID
			m.maChecked[id] = !m.maChecked[id]
		}
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		var ids []int
		for _, s := range m.maSprints {
			if m.maChecked[s.ID] {
				ids = append(ids, s.ID)
			}
		}
		m.maPick = false
		if len(ids) == 0 {
			m.status = noticeText("No sprints checked")
			return m, nil
		}
		m.status = fmt.Sprintf("%d sprint(s) → milestone …", len(ids))
		return m, doAssignSprintsToMilestone(m.client, ids, m.maMilestoneID)
	}
	return m, nil
}

func (m model) milestoneAssignMenu() string {
	name := ""
	if ms := m.selMilestone(); ms != nil {
		name = ms.Name
	}
	body := theme.Dim.Render("space: toggle   enter: assign   esc: cancel") + "\n\n"
	if len(m.maSprints) == 0 {
		body += theme.Dim.Render("(no sprints without milestone — or loading …)") + "\n"
	}
	body += menuList(len(m.maSprints), m.maMenu.cursor, func(i int, sel bool) string {
		s := m.maSprints[i]
		box := theme.Dim.Render("[ ]")
		if m.maChecked[s.ID] {
			box = theme.Accent.Render("[x]")
		}
		label := fmt.Sprintf("%-9s %s", s.Key, truncate(s.Name, 26))
		if sel {
			label = theme.Header.Render(label)
		}
		return box + " " + label
	})
	return modalPanel("Assign sprints → "+truncate(name, 28), body, "", clampModalWidth(50, m.width), theme.Mauve)
}
