package tui

import (
	"fmt"
	"strings"

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
	viewReview
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

	// Review-Cockpit (über curSprint.Items)
	rlist           listState
	inputting       bool   // Reject-Kommentar-Eingabe aktiv
	input           string // Kommentar-Puffer
	confirmComplete bool   // Doppel-C-Bestätigung für Sprint-Abschluss
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
		if m.view == viewReview && m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
			m.status = ""
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
	// Review-Cockpit hat eigenen Eingabemodus → zuerst, vor globalen Tasten.
	if m.view == viewReview {
		return m.keyReview(msg)
	}
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
	case "R":
		if s := m.selSprint(); s != nil {
			m.view = viewReview
			m.rlist.reset()
			m.confirmComplete = false
			cmd := m.syncSprint()
			if m.curSprint != nil && m.curSprint.ID == s.ID {
				m.rlist.setLen(len(m.curSprint.Items))
			}
			return m, cmd
		}
	}
	return m, nil
}

// keyReview behandelt das Review-Cockpit inkl. Reject-Kommentar-Eingabe.
func (m model) keyReview(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.inputting {
		switch msg.Type {
		case tea.KeyEnter:
			comment := strings.TrimSpace(m.input)
			m.inputting = false
			m.input = ""
			if comment == "" {
				m.status = "Reject abgebrochen — Kommentar war leer"
				return m, nil
			}
			it := m.reviewItem()
			if it == nil || m.curSprint == nil {
				return m, nil
			}
			m.status = "Reject gesendet …"
			return m, doVerdict(m.client, it.ID, "not_passed", comment, m.curSprint.ID)
		case tea.KeyEsc:
			m.inputting = false
			m.input = ""
			m.status = "Reject abgebrochen"
			return m, nil
		case tea.KeyBackspace, tea.KeyDelete:
			if len(m.input) > 0 {
				r := []rune(m.input)
				m.input = string(r[:len(r)-1])
			}
			return m, nil
		default:
			m.input += string(msg.Runes)
			return m, nil
		}
	}

	switch navKey(msg.String()) {
	case "up":
		m.rlist.move(-1)
		return m, nil
	case "down":
		m.rlist.move(1)
		return m, nil
	}
	switch msg.String() {
	case "q", "esc":
		m.view = viewColumns
		m.status = ""
		return m, nil
	case "a":
		if it := m.reviewItem(); it != nil && m.curSprint != nil {
			m.status = "Pass gesendet …"
			return m, doVerdict(m.client, it.ID, "passed", "", m.curSprint.ID)
		}
	case "x":
		if m.reviewItem() != nil {
			m.inputting = true
			m.input = ""
			m.status = "Reject-Kommentar (enter=senden, esc=abbrechen): "
		}
	case "S":
		if m.curSprint != nil {
			m.status = "Sprint → review …"
			return m, doSprintTo(m.client, m.curSprint.ID, "review")
		}
	case "C":
		if m.curSprint == nil {
			return m, nil
		}
		if !m.confirmComplete {
			m.confirmComplete = true
			m.status = "Sprint abschließen? Nochmal C zum Bestätigen (PO/DD-186)"
			return m, nil
		}
		m.confirmComplete = false
		m.status = "Sprint wird abgeschlossen …"
		return m, doSprintTo(m.client, m.curSprint.ID, "completed")
	}
	return m, nil
}

// reviewItem ist das aktuell im Cockpit selektierte Issue.
func (m *model) reviewItem() *api.Issue {
	if m.curSprint != nil && m.rlist.cursor >= 0 && m.rlist.cursor < len(m.curSprint.Items) {
		return &m.curSprint.Items[m.rlist.cursor]
	}
	return nil
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
