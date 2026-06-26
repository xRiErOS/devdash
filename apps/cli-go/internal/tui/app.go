package tui

import (
	"fmt"

	"devd-cli/internal/api"
	"devd-cli/internal/config"
	tea "github.com/charmbracelet/bubbletea"
)

type viewID int

const (
	viewPicker viewID = iota
	viewColumns
	viewDetail
	viewBacklog
)

type model struct {
	client  *api.Client // projekt-gescopt (nil bis Picker-Wahl)
	global  *api.Client // projekt-los (ListProjects)
	project *api.Project

	view          viewID
	width, height int
	err           error
	status        string

	// Picker
	projects []api.Project
	plist    listState

	// Columns (Meilenstein → Sprint → Issue)
	milestones []api.Milestone
	mlist      listState
	slist      listState
	ilist      listState
	curSprint  *api.Sprint // geladene items des selektierten Sprints
	depth      int         // Fokus-Ebene 0=Meilenstein 1=Sprint 2=Issue

	// Backlog
	backlog []api.Issue
	blist   listState
}

func newModel(client *api.Client, project *api.Project, global *api.Client) model {
	m := model{client: client, project: project, global: global}
	if project == nil {
		m.view = viewPicker
	} else {
		m.view = viewColumns
	}
	return m
}

// Run startet die TUI. project==nil → Picker zuerst.
func Run(client *api.Client, project *api.Project, global *api.Client) error {
	_, err := tea.NewProgram(newModel(client, project, global), tea.WithAltScreen()).Run()
	return err
}

func (m model) Init() tea.Cmd {
	if m.view == viewPicker {
		return loadProjects(m.global)
	}
	return loadMilestones(m.client)
}

// --- Selektions-Helfer (bounds-sicher) ---

func (m *model) selMilestone() *api.Milestone {
	if m.mlist.cursor >= 0 && m.mlist.cursor < len(m.milestones) {
		return &m.milestones[m.mlist.cursor]
	}
	return nil
}

func (m *model) sprintsOfSel() []api.Sprint {
	if ms := m.selMilestone(); ms != nil {
		return ms.Sprints
	}
	return nil
}

func (m *model) selSprint() *api.Sprint {
	sp := m.sprintsOfSel()
	if m.slist.cursor >= 0 && m.slist.cursor < len(sp) {
		return &sp[m.slist.cursor]
	}
	return nil
}

func (m *model) issuesOfSel() []api.Issue {
	if s := m.selSprint(); s != nil && m.curSprint != nil && m.curSprint.ID == s.ID {
		return m.curSprint.Items
	}
	return nil
}

func (m *model) selIssue() *api.Issue {
	is := m.issuesOfSel()
	if m.ilist.cursor >= 0 && m.ilist.cursor < len(is) {
		return &is[m.ilist.cursor]
	}
	return nil
}

// syncSprint lädt die Items des aktuell selektierten Sprints, falls noch nicht geladen.
func (m *model) syncSprint() tea.Cmd {
	s := m.selSprint()
	if s == nil {
		m.curSprint = nil
		return nil
	}
	if m.curSprint != nil && m.curSprint.ID == s.ID {
		return nil
	}
	m.curSprint = nil
	return loadSprint(m.client, s.ID)
}

func navKey(k string) string {
	switch k {
	case "up", "k":
		return "up"
	case "down", "j":
		return "down"
	case "left", "h":
		return "left"
	case "right", "l", "tab":
		return "right"
	}
	return k
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil
	case errMsg:
		m.err = msg.err
		return m, nil
	case statusMsg:
		m.status = msg.text
		return m, nil
	case projectsMsg:
		m.projects = msg.items
		m.plist.setLen(len(m.projects))
		return m, nil
	case milestonesMsg:
		m.milestones = msg.items
		m.mlist.setLen(len(m.milestones))
		return m, m.syncSprint()
	case sprintMsg:
		m.curSprint = msg.sprint
		if s := m.selSprint(); s != nil && m.curSprint != nil && s.ID == m.curSprint.ID {
			m.ilist.setLen(len(m.curSprint.Items))
		}
		return m, nil
	case backlogMsg:
		m.backlog = msg.items
		m.blist.setLen(len(m.backlog))
		return m, nil
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	k := msg.String()
	// Globale Tasten
	switch k {
	case "ctrl+c", "q":
		if m.view == viewDetail || m.view == viewBacklog {
			m.view = viewColumns
			return m, nil
		}
		return m, tea.Quit
	case "p":
		if m.global != nil {
			m.view = viewPicker
			return m, loadProjects(m.global)
		}
	}

	switch m.view {
	case viewPicker:
		return m.keyPicker(k)
	case viewColumns:
		return m.keyColumns(k)
	case viewDetail:
		if k == "esc" {
			m.view = viewColumns
		}
		return m, nil
	case viewBacklog:
		return m.keyBacklog(k)
	}
	return m, nil
}

func (m model) keyPicker(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.plist.move(-1)
	case "down":
		m.plist.move(1)
	case "enter":
		if m.plist.cursor < len(m.projects) {
			p := m.projects[m.plist.cursor]
			m.project = &p
			m.client = api.NewClient(fmt.Sprintf("%d", p.ID))
			_ = config.Save(config.State{LastProject: p.Slug})
			m.view = viewColumns
			m.milestones = nil
			m.depth = 0
			m.mlist = listState{}
			m.slist = listState{}
			m.ilist = listState{}
			m.curSprint = nil
			return m, loadMilestones(m.client)
		}
	}
	return m, nil
}

func (m model) keyColumns(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.focusList().move(-1)
		return m, m.onFocusMove()
	case "down":
		m.focusList().move(1)
		return m, m.onFocusMove()
	case "right":
		if m.depth < 2 {
			m.depth++
			return m, m.syncSprint()
		}
	case "left":
		if m.depth > 0 {
			m.depth--
		}
		return m, nil
	}
	switch k {
	case "enter":
		if m.depth == 2 && m.selIssue() != nil {
			m.view = viewDetail
		}
	case "b":
		m.view = viewBacklog
		return m, loadBacklog(m.client)
	}
	return m, nil
}

// focusList liefert die Liste der aktuellen Fokus-Ebene.
func (m *model) focusList() *listState {
	switch m.depth {
	case 0:
		return &m.mlist
	case 1:
		return &m.slist
	default:
		return &m.ilist
	}
}

// onFocusMove hält abhängige Ebenen konsistent + triggert Lazy-Loads.
func (m *model) onFocusMove() tea.Cmd {
	switch m.depth {
	case 0:
		m.slist.reset()
		m.ilist.reset()
		m.slist.setLen(len(m.sprintsOfSel()))
		return m.syncSprint()
	case 1:
		m.ilist.reset()
		return m.syncSprint()
	}
	return nil
}

func (m model) keyBacklog(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.blist.move(-1)
	case "down":
		m.blist.move(1)
	}
	if k == "b" || k == "esc" {
		m.view = viewColumns
	}
	return m, nil
}
