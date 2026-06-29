package tui

import (
	"devd-cli/internal/api"
	"devd-cli/internal/config"
	"devd-cli/internal/theme"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func newModel(client *api.Client, project *api.Project, global *api.Client) model {
	m := model{client: client, project: project, global: global}
	m.reviewReturn = viewTree // DD2-111: Default-Rückkehr aus dem Cockpit = Tree-Primat (Ranger gesunset)
	m.topReturn = viewTree    // Tree ist Primat-Heimat (DD2-61)
	m.treeExpMile = map[int]bool{}
	m.treeExpSprint = map[int]bool{}
	m.treeIssues = map[int][]api.Issue{}
	m.accOpen = 1         // DD2-50: erste Accordion-Section default offen
	ti := textinput.New() // DD2-62: Tree-Suchfeld
	ti.Placeholder = "Search for terms"
	ti.Prompt = ""
	ti.CharLimit = 60
	m.treeSearch = ti
	bs := textinput.New() // DD2-46: Backlog-Suchfeld
	bs.Placeholder = "Search the backlog"
	bs.Prompt = ""
	bs.CharLimit = 60
	m.blSearch = bs
	ps := textinput.New() // DD2-41: Projekt-Suchfeld
	ps.Placeholder = "Search for project…"
	ps.Prompt = ""
	ps.CharLimit = 40
	m.projectSearch = ps
	m.fArt = map[treeKind]bool{}
	m.fType = map[string]bool{}
	m.fStatus = map[string]bool{}
	m.fTags = map[string]bool{}
	m.depsCache = map[string]*api.Dependencies{}
	// DD2-154: Project-Browser blendet abgeschlossene Einträge über ALLE Spalten
	// standardmäßig aus (completed/cancelled — nach DD2-155 ist auch das Issue-Terminal
	// „completed", nicht mehr „done"). Per Filter-Menü (f) jederzeit wieder einblendbar.
	m.fMile = filterState{hidden: map[string]bool{"completed": true, "cancelled": true, deferredKey: true}}
	m.fSprint = filterState{hidden: map[string]bool{"completed": true, "cancelled": true}}
	m.fIssue = filterState{hidden: map[string]bool{"cancelled": true, "completed": true}}
	if project == nil {
		m.view = viewHome // DD2-124: Lobby (Logo + Projektauswahl) als Einstieg
	} else {
		m.view = viewTree // DD2-61: Tree+Detail ist Primat-View (Ranger via t sekundär)
	}
	return m
}

// Run startet die TUI. project==nil → Picker zuerst.
func Run(client *api.Client, project *api.Project, global *api.Client) error {
	// DD2-24: huh-Forms (ThemeCharm) nutzen lipgloss-AdaptiveColor und lösen gegen
	// die Background-Detection des Default-Renderers auf. Über ssh+tmux liefert die
	// OSC-11-Abfrage eine helle Farbe → Forms rendern helles Theme (leuchtender BG).
	// Detection hart auf dunkel zwingen → terminal-unabhängig, app ist durchweg dunkel.
	lipgloss.SetHasDarkBackground(true)
	// DD2-40: TUI-Settings laden (User-Config + lokaler Override) und anwenden.
	// Bewusst HIER (nicht in newModel), damit Tests FS-frei/deterministisch bleiben.
	m := newModel(client, project, global)
	cfg, _ := config.LoadSettings()
	m.cfg = cfg
	if cfg.Theme.Accent != "" {
		theme.SetAccent(cfg.Theme.Accent) // globaler Akzent (Cursor/Header)
	}
	defaultModalWidth = cfg.Layout.ModalWidth // Standard-Modalbreite (DD2-55-Clamp greift weiter)

	// DD2-51: Maus aktivieren (CellMotion = Klick + Wheel + Move-Tracking).
	_, err := tea.NewProgram(m,
		tea.WithAltScreen(), tea.WithMouseCellMotion()).Run()
	return err
}

func (m model) Init() tea.Cmd {
	if m.view == viewHome {
		return loadProjects(m.global)
	}
	// Tags mitladen, damit die Create-Forms (DD2-33) sofort ein Tag-Multiselect haben.
	return tea.Batch(loadMilestones(m.client), loadTags(m.client))
}

// --- Sichtbare (gefilterte) Listen ---

func (m *model) visSprints() []api.Sprint {
	ms := m.selMilestone()
	if ms == nil {
		return nil
	}
	out := make([]api.Sprint, 0, len(ms.Sprints))
	for _, s := range ms.Sprints {
		if !m.fSprint.shown(s.Status) {
			continue
		}
		out = append(out, s)
	}
	return out
}

func (m *model) visIssues() []api.Issue {
	is := m.issuesOfSel()
	if is == nil {
		return nil
	}
	out := make([]api.Issue, 0, len(is))
	for _, it := range is {
		if !m.fIssue.shown(it.Status) {
			continue
		}
		out = append(out, it)
	}
	return out
}

// --- Selektions-Helfer (bounds-sicher, auf sichtbaren Listen) ---

func (m *model) selMilestone() *api.Milestone {
	vs := m.visMilestonesRaw()
	if m.mlist.cursor >= 0 && m.mlist.cursor < len(vs) {
		return &vs[m.mlist.cursor]
	}
	return nil
}

// visMilestonesRaw filtert ohne selMilestone-Rekursion (für selMilestone selbst).
func (m *model) visMilestonesRaw() []api.Milestone {
	out := make([]api.Milestone, 0, len(m.milestones))
	for _, ms := range m.milestones {
		if !m.fMile.shown(ms.Status) {
			continue
		}
		if ms.Deferred == 1 && !m.fMile.shown(deferredKey) {
			continue
		}
		out = append(out, ms)
	}
	return out
}

func (m *model) selSprint() *api.Sprint {
	sp := m.visSprints()
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
	is := m.visIssues()
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

// navKey lebt jetzt in keymap.go (DD2-47): keymap-getriebene Richtungs-Normalisierung.
