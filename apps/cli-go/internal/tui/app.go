package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
	"devd-cli/internal/config"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
)

type viewID int

const (
	viewPicker viewID = iota
	viewColumns
	viewDetail
	viewBacklog
	viewReview
	viewMilestone
	viewSprint
	viewReviewsList
	viewMemory
	viewTree // DD2-57: Tree+Detail-Layout-Prototyp
)

// filterState hält pro Spalte, welche Werte ausgeblendet sind.
type filterState struct {
	hidden map[string]bool
}

func (f filterState) shown(val string) bool { return !f.hidden[val] }
func (f *filterState) toggle(val string)    { f.hidden[val] = !f.hidden[val] }

const deferredKey = "__deferred__" // Pseudo-Wert: zurückgestellte Meilensteine zeigen

type filterOpt struct {
	value string
	label string
}

type model struct {
	client  *api.Client // projekt-gescopt (nil bis Picker-Wahl)
	global  *api.Client // projekt-los (ListProjects)
	project *api.Project

	view          viewID
	width, height int
	err           error
	status        string // Info/Meldungen (Footer-Zone 4 links, Blue)
	errNote       string // transienter, nicht-fataler Fehler (Footer-Zone 4 rechts, Red) — DD2-60
	scroll        int    // Scroll-Offset für statische Detail-Views (DD2-25/30 Chrome)

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

	// Filter (Default-Hide + f-Modal)
	fMile, fSprint, fIssue filterState
	filtering              bool
	fcur                   listState
	fopts                  []filterOpt
	ftarget                int // depth, dessen Filter editiert wird

	// Backlog
	backlog []api.Issue
	blist   listState

	// Review-Cockpit (über curSprint.Items)
	rlist           listState
	inputting       bool   // Reject-Kommentar-Eingabe aktiv
	input           string // Kommentar-Puffer
	confirmComplete bool   // Doppel-C-Bestätigung für Sprint-Abschluss
	statusPick      bool   // s: Issue-Status-Menü aktiv (Cockpit + Columns/Detail, DD2-29)
	stIssueID       int    // Ziel-Issue des Status-Menüs
	stIssueStatus   string // aktueller Status des Ziel-Issues (Menü-Kopf)
	stSprintID      int    // Sprint-Kontext für Refresh (0 = keiner)
	smenu           listState
	sopts           []string
	sprintPick      bool // Sprint-Status-Menü aktiv (Cockpit S / Columns s, T05)
	spmenu          listState
	spopts          []string
	spTargetID      int    // Ziel-Sprint des Status-Menüs (Cockpit oder Columns)
	spCurStatus     string // aktueller Status des Ziel-Sprints (Menü-Kopf)

	// User-Story-Abnahme-Modal (T14): enter im Review öffnet goal/background/US.
	usOpen    bool
	usList    []api.UserStory
	uslist    listState
	usIssueID int

	// Reviews-Page (T17): R öffnet zuerst die Liste offener Review-Sprints.
	reviewSprints []api.Sprint
	rvlist        listState
	reviewReturn  viewID // wohin Cockpit-q/esc zurückkehrt (Liste vs. Columns)
	// topReturn = Heimat-View für Backlog/Reviews-Liste-q/esc. Da Tree jetzt Primat
	// ist (DD2-61), merkt sich der Einstieg, ob aus Tree oder Columns gekommen — sonst
	// landet man immer in den Columns. Wird beim Öffnen auf die Quell-View gesetzt.
	topReturn viewID

	// Meilenstein-Status-Menü (T01): S auf fokussiertem Meilenstein.
	msPick     bool
	msmenu     listState
	msopts     []string
	msTargetID int

	// Sprint→Meilenstein-Picker (T03 Flow A): m in Sprint-Details (single-select).
	smPick     bool
	smSprintID int
	smMenu     listState
	smOpts     []smOpt

	// Meilenstein→Sprints-Zuweisung (T03 Flow B): a in Meilenstein-Detail (Checkliste).
	maPick        bool
	maMilestoneID int
	maSprints     []api.Sprint
	maChecked     map[int]bool
	maMenu        listState

	// Cascade-Delete-Confirm (T02b): d auf Meilenstein/Sprint.
	delConfirm bool
	delKind    string // milestone | sprint
	delID      int
	delName    string
	delLoading bool // wartet auf Preview-Counts
	delSprints int
	delIssues  int
	delDocs    int

	// Meilenstein-Cascade-Complete-Confirm (DD2-28): completed mit offenen Sprints.
	mcConfirm bool
	mcID      int
	mcName    string
	mcSprints int

	// Memory-Browser (T18): Master-Detail über project_memories.
	memList      []api.ProjectMemory
	memlist      listState
	memDetail    *api.ProjectMemory // full (content) des selektierten Memorys
	memDetailID  int
	memSearching bool
	memQuery     string
	memCat       string // aktiver Kategorie-Filter ("" = alle)

	// Command-Center (T16): globales Action-Palette-Modal (ctrl+k / shift+k).
	paletteOpen bool
	palQuery    string
	palList     listState

	// Eingebettetes huh-Create-Formular (T16). nil = inaktiv.
	form     *huh.Form
	formKind string // issue | milestone | sprint | memory | result

	// Ziel des result-Formulars (I02): r im Cockpit füllt das Ergebnisfeld.
	resultIssueID  int
	resultIssueKey string
	resultSprintID int

	// Tree+Detail-Layout-Prototyp (DD2-57): t aus den Columns. Expansions-Sets +
	// Lazy-Issue-Cache pro Sprint; treeCursor läuft über die geflachte Knotenliste.
	treeExpMile   map[int]bool
	treeExpSprint map[int]bool
	treeIssues    map[int][]api.Issue
	treeCursor    int

	// Tree-Suche (DD2-62): `/` öffnet das Suchfeld im Tree-Kopf, tippen filtert live.
	// treeSearching = Eingabe fokussiert; treeQuery = aktiver Filter (auch nach enter).
	treeSearch    textinput.Model
	treeSearching bool
	treeQuery     string
}

// issueStatusOptions sind die manuell wählbaren Lifecycle-Ziele. Bewusst OHNE
// passed/rejected/done: passed/rejected MÜSSEN über das Review-Verdikt (a/x)
// laufen, das eine review_feedback-Zeile schreibt — sonst blockiert der
// Sprint-Abschluss (Backend-Gate prüft review_feedback, nicht den Status).
// done ist system-only (nur via Sprint-Complete). Backend validiert zusätzlich.
var issueStatusOptions = []string{"refined", "planned", "in_progress", "to_review"}

// issueTransitions spiegelt lifecycle.js (canTransition) — nur die manuell
// relevanten Vorwärts-/Reopen-Kanten. passed/rejected→via Verdikt, done=system.
var issueTransitions = map[string][]string{
	"new":         {"refined"},
	"refined":     {"new", "planned"},
	"planned":     {"refined", "in_progress"},
	"in_progress": {"to_review", "planned"},
	"to_review":   {"planned"}, // passed/rejected nur über Verdikt
	"rejected":    {"in_progress", "planned"},
	"passed":      {"planned"}, // Reopen für nächsten Sprint
	"done":        {"planned"},
	"cancelled":   {"refined"},
}

// milestoneTransitions spiegelt canMilestoneTransition (lifecycle.js, forward-only).
// cancelled ausgelassen (braucht cancellation_notes) — analog Sprint-Menü.
// active→completed gated das Backend (alle Sprints terminal) → kommt als Hinweis zurück.
var milestoneTransitions = map[string][]string{
	"planning":  {"active"},
	"active":    {"completed"},
	"completed": {"active"}, // sanktionierter Reopen (DD-357)
	"cancelled": {"planning"},
}

// sprintTransitions spiegelt canSprintTransition (lifecycle.js). completed läuft
// über den dedizierten /complete-Endpoint (eigener Menüpunkt mit Gate), cancelled
// braucht Notes → hier ausgelassen.
var sprintTransitions = map[string][]string{
	"planning":  {"active"},
	"active":    {"review", "planning"},
	"review":    {"active", "completed"},
	"completed": {},
	"closed":    {},
	"cancelled": {"planning"},
}

// allowedManualStatuses liefert die vom aktuellen Status erlaubten manuellen
// Ziele (Schnitt aus Lifecycle-Kanten und issueStatusOptions) — verhindert, dass
// das Menü ungültige Übergänge (z.B. passed→to_review) anbietet.
func allowedManualStatuses(from string) []string {
	allowed := map[string]bool{}
	for _, t := range issueTransitions[from] {
		allowed[t] = true
	}
	var out []string
	for _, s := range issueStatusOptions {
		if allowed[s] {
			out = append(out, s)
		}
	}
	return out
}

func newModel(client *api.Client, project *api.Project, global *api.Client) model {
	m := model{client: client, project: project, global: global}
	m.reviewReturn = viewColumns // Default-Rückkehr aus dem Cockpit
	m.topReturn = viewTree       // Tree ist Primat-Heimat (DD2-61)
	m.treeExpMile = map[int]bool{}
	m.treeExpSprint = map[int]bool{}
	m.treeIssues = map[int][]api.Issue{}
	ti := textinput.New() // DD2-62: Tree-Suchfeld
	ti.Placeholder = "Suche nach Begriffen"
	ti.Prompt = ""
	ti.CharLimit = 60
	m.treeSearch = ti
	m.fMile = filterState{hidden: map[string]bool{"completed": true, "cancelled": true, deferredKey: true}}
	m.fSprint = filterState{hidden: map[string]bool{"completed": true, "cancelled": true}}
	m.fIssue = filterState{hidden: map[string]bool{"cancelled": true}}
	if project == nil {
		m.view = viewPicker
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
	_, err := tea.NewProgram(newModel(client, project, global), tea.WithAltScreen()).Run()
	return err
}

func (m model) Init() tea.Cmd {
	if m.view == viewPicker {
		return loadProjects(m.global)
	}
	return loadMilestones(m.client)
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
	// Aktives huh-Create-Formular (T16) fängt alle Messages, bis abgeschlossen/abgebrochen.
	if m.form != nil {
		if sz, ok := msg.(tea.WindowSizeMsg); ok {
			m.width, m.height = sz.Width, sz.Height
		}
		return m.updateForm(msg)
	}
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil
	case createdMsg:
		m.status = noticeText("Angelegt: " + msg.label)
		switch msg.kind {
		case "milestone", "sprint":
			return m, loadMilestones(m.client) // Columns neu (neue Spalten-Items)
		case "issue":
			if m.view == viewBacklog {
				return m, loadBacklog(m.client)
			}
		case "memory":
			if m.view == viewMemory {
				return m, loadMemories(m.client, m.memCat)
			}
		}
		return m, nil
	case errMsg:
		m.err = msg.err
		return m, nil
	case statusMsg:
		m.status = msg.text
		return m, nil
	case noticeMsg:
		m.status = noticeText(msg.text) // Sapphire-Hinweis (Aktions-Fehler/Info)
		return m, nil
	case userStoriesMsg:
		if msg.issueID == m.usIssueID {
			m.usList = msg.items
			m.uslist.setLen(len(m.usList))
		}
		return m, nil
	case projectsMsg:
		m.projects = msg.items
		m.plist.setLen(len(m.projects))
		return m, nil
	case milestonesMsg:
		m.milestones = msg.items
		m.mlist.setLen(len(m.visMilestonesRaw()))
		return m, m.syncSprint()
	case sprintMsg:
		m.curSprint = msg.sprint
		if msg.sprint != nil { // DD2-57: Tree-Lazy-Cache mitfüllen (egal von wo geladen)
			if m.treeIssues == nil {
				m.treeIssues = map[int][]api.Issue{}
			}
			m.treeIssues[msg.sprint.ID] = msg.sprint.Items
			m.status = ""
		}
		if s := m.selSprint(); s != nil && m.curSprint != nil && s.ID == m.curSprint.ID {
			m.ilist.setLen(len(m.visIssues()))
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
	case reviewSprintsMsg:
		m.reviewSprints = msg.items
		m.rvlist.setLen(len(m.reviewSprints))
		return m, nil
	case memoriesMsg:
		m.memList = msg.items
		m.memlist.setLen(len(m.memList))
		return m, m.syncMemDetail()
	case memDetailMsg:
		if msg.mem != nil {
			m.memDetail = msg.mem
			m.memDetailID = msg.mem.ID
		}
		return m, nil
	case unassignedSprintsMsg:
		m.maSprints = msg.items
		m.maMenu.setLen(len(m.maSprints))
		return m, nil
	case deletePreviewMsg:
		if m.delConfirm && msg.id == m.delID && msg.kind == m.delKind {
			m.delLoading = false
			m.delSprints, m.delIssues, m.delDocs = msg.sprints, msg.issues, msg.docs
			if msg.name != "" {
				m.delName = msg.name
			}
		}
		return m, nil
	case deleteDoneMsg:
		m.status = noticeText("Gelöscht: " + msg.name)
		// Columns + ggf. Cockpit/Detail-Quelle frisch; zurück auf Columns-Sicht.
		m.curSprint = nil
		if m.view == viewMilestone || m.view == viewSprint {
			m.view = viewColumns
		}
		return m, loadMilestones(m.client)
	case reworkDoneMsg:
		m.curSprint = msg.sprint
		if m.curSprint != nil {
			m.rlist.setLen(len(m.curSprint.Items))
		}
		m.status = noticeText("Rework fertig → Issue ist to_review, jetzt a:pass")
		return m, nil
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

// updateForm leitet Messages ans laufende huh-Formular weiter und feuert nach
// Abschluss den Create-Cmd (T16). Abbruch (esc) verwirft ohne Aktion.
func (m model) updateForm(msg tea.Msg) (tea.Model, tea.Cmd) {
	// esc bricht das Formular ab (huh selbst kennt nur ctrl+c) — vertraute Cancel-Taste.
	if k, ok := msg.(tea.KeyMsg); ok && k.Type == tea.KeyEsc {
		m.form = nil
		m.formKind = ""
		m.status = ""
		return m, nil
	}
	form, cmd := m.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		m.form = f
	}
	switch m.form.State {
	case huh.StateCompleted:
		createCmd := m.formCreateCmd()
		m.form = nil
		m.formKind = ""
		return m, createCmd
	case huh.StateAborted:
		m.form = nil
		m.formKind = ""
		m.status = ""
		return m, nil
	}
	return m, cmd
}

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Command-Center (T16) ist das globalste Modal — fängt vor allem anderen.
	if m.paletteOpen {
		return m.keyPalette(msg)
	}
	// ctrl+k / shift+k öffnet das Command-Center von überall (außer in Text-Eingabe).
	if k := msg.String(); k == "ctrl+k" || k == "K" {
		if !m.inputting {
			return m.openPalette()
		}
	}
	// Meilenstein-Status-Menü (T01) fängt vor View-Tasten.
	if m.msPick {
		return m.keyMilestoneStatus(msg)
	}
	// Sprint-Status-Menü (T05) ist view-übergreifend (Cockpit S + Columns s).
	if m.sprintPick {
		return m.keySprintPick(msg)
	}
	// Issue-Status-Menü (DD2-29) view-übergreifend (Cockpit s + Columns/Detail s).
	if m.statusPick {
		return m.keyStatusPick(msg)
	}
	// Sprint↔Meilenstein-Zuweisung (T03).
	if m.smPick {
		return m.keySprintMilestone(msg)
	}
	if m.maPick {
		return m.keyMilestoneAssign(msg)
	}
	// Cascade-Delete-Confirm (T02b) fängt vor View-Tasten.
	if m.delConfirm {
		return m.keyDelete(msg)
	}
	// Meilenstein-Cascade-Complete-Confirm (DD2-28).
	if m.mcConfirm {
		return m.keyMilestoneCascade(msg)
	}
	// Filter-Modal fängt zuerst.
	if m.filtering {
		return m.keyFilter(msg)
	}
	// Review-Cockpit hat eigenen Eingabemodus.
	if m.view == viewReview {
		return m.keyReview(msg)
	}
	// Memory-Browser fängt voll (Suche tippt q/R/p als Text).
	if m.view == viewMemory {
		return m.keyMemory(msg)
	}
	// Tree+Detail-Prototyp (DD2-57) fängt voll (eigene Nav + t/esc zurück).
	if m.view == viewTree {
		return m.keyTree(msg)
	}
	k := msg.String()
	// Globale Tasten
	switch k {
	case "ctrl+c", "q":
		switch m.view {
		case viewBacklog, viewReviewsList: // dual-entry → zur Quell-View (Tree/Columns)
			m.view = m.topReturn
			return m, nil
		case viewDetail, viewMilestone, viewSprint: // nur aus Columns erreichbar
			m.view = viewColumns
			return m, nil
		}
		return m, tea.Quit
	case "p":
		if m.global != nil {
			m.view = viewPicker
			return m, loadProjects(m.global)
		}
	case "R": // T17: R öffnet von überall die Liste offener Review-Sprints
		return m.openReviewsList()
	}

	switch m.view {
	case viewPicker:
		return m.keyPicker(k)
	case viewColumns:
		return m.keyColumns(k)
	case viewDetail:
		if m.keyScroll(k) { // DD2-30: scrollbarer Detail-Body
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "s": // DD2-29: Issue-Status auch im Detail mutieren
			if it := m.selIssue(); it != nil {
				sid := 0
				if m.curSprint != nil {
					sid = m.curSprint.ID
				}
				return m.openIssueStatus(it, sid)
			}
		}
		return m, nil
	case viewMilestone:
		if m.keyScroll(k) {
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "S":
			return m.openMilestoneStatus()
		case "a": // T03 Flow B: Sprints diesem Meilenstein zuweisen (Checkliste)
			return m.openMilestoneAssign()
		case "d": // T02b: Meilenstein kaskadierend löschen
			if ms := m.selMilestone(); ms != nil {
				return m.openDelete("milestone", ms.ID, ms.Name)
			}
		}
		return m, nil
	case viewSprint:
		if m.keyScroll(k) {
			return m, nil
		}
		switch k {
		case "esc":
			m.view = viewColumns
		case "y":
			return m.yankContext()
		case "m": // T03 Flow A: diesen Sprint einem Meilenstein zuweisen
			if s := m.selSprint(); s != nil {
				return m.openSprintMilestone(s.ID)
			}
		case "d": // T02b: Sprint kaskadierend löschen
			if s := m.selSprint(); s != nil {
				return m.openDelete("sprint", s.ID, s.Name)
			}
		}
		return m, nil
	case viewReviewsList:
		return m.keyReviewsList(k)
	case viewBacklog:
		return m.keyBacklog(k)
	}
	return m, nil
}

// openReviewsList öffnet die Liste offener Review-Sprints (T17). Merkt die
// Quell-View (Tree/Columns), damit q/esc dorthin zurückkehrt (DD2-61 Primat).
func (m model) openReviewsList() (tea.Model, tea.Cmd) {
	if m.view == viewTree || m.view == viewColumns {
		m.topReturn = m.view
	}
	m.view = viewReviewsList
	m.rvlist = listState{}
	m.status = ""
	return m, loadReviewSprints(m.client)
}

// openBacklog öffnet die Backlog-Liste und merkt die Quell-View (Tree/Columns)
// für die Rückkehr (DD2-61 Primat) — geteilt von keyTree und keyColumns.
func (m model) openBacklog() (tea.Model, tea.Cmd) {
	if m.view == viewTree || m.view == viewColumns {
		m.topReturn = m.view
	}
	m.view = viewBacklog
	return m, loadBacklog(m.client)
}

// keyReviewsList steuert die Review-Sprint-Liste: Auswahl öffnet das Cockpit.
func (m model) keyReviewsList(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.rvlist.move(-1)
		return m, nil
	case "down":
		m.rvlist.move(1)
		return m, nil
	}
	switch k {
	case "esc", "R":
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
		return m, nil
	case "enter":
		if m.rvlist.cursor >= 0 && m.rvlist.cursor < len(m.reviewSprints) {
			s := m.reviewSprints[m.rvlist.cursor]
			m.view = viewReview
			m.reviewReturn = viewReviewsList // q/esc kehrt zur Liste zurück
			m.rlist.reset()
			m.confirmComplete = false
			m.curSprint = nil
			return m, loadSprint(m.client, s.ID)
		}
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
			m.view = viewTree // DD2-61: nach Projektwahl direkt in den Primat-View
			m.treeCursor = 0
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
		if m.depth == 0 && m.selMilestone() != nil {
			m.view = viewMilestone
			m.scroll = 0
		} else if m.depth == 1 && m.selSprint() != nil {
			m.view = viewSprint
			m.scroll = 0
			return m, m.syncSprint()
		} else if m.depth == 2 && m.selIssue() != nil {
			m.view = viewDetail
			m.scroll = 0
		}
	case "f":
		return m.openFilter()
	case "y":
		return m.yankContext()
	case "b":
		return m.openBacklog()
	case "t": // DD2-57: Tree+Detail-Layout-Prototyp (Vergleich zum Ranger)
		m.view = viewTree
		m.treeCursor = 0
		m.status = ""
		return m, nil
	case "S": // T01: Meilenstein-Status (nur auf fokussiertem Meilenstein)
		if m.depth == 0 {
			return m.openMilestoneStatus()
		}
	case "s": // T05: Sprint-Status (depth 1) / DD2-29: Issue-Status (depth 2)
		if m.depth == 1 {
			if sp := m.selSprint(); sp != nil {
				return m.openSprintStatus(sp.ID, sp.Status)
			}
		} else if m.depth == 2 {
			if it := m.selIssue(); it != nil {
				sid := 0
				if m.curSprint != nil {
					sid = m.curSprint.ID
				}
				return m.openIssueStatus(it, sid)
			}
		}
	case "d": // T02b: Cascade-Delete des fokussierten Meilensteins/Sprints
		if m.depth == 0 {
			if ms := m.selMilestone(); ms != nil {
				return m.openDelete("milestone", ms.ID, ms.Name)
			}
		} else if m.depth == 1 {
			if sp := m.selSprint(); sp != nil {
				return m.openDelete("sprint", sp.ID, sp.Name)
			}
		}
	}
	return m, nil
}

// openSprintStatus öffnet das Sprint-Status-Menü für einen Ziel-Sprint
// (Cockpit S oder Columns s, T05) — lifecycle-gültige Transitions.
func (m model) openSprintStatus(id int, status string) (tea.Model, tea.Cmd) {
	opts := sprintTransitions[status]
	if len(opts) == 0 {
		m.status = noticeText("Keine Sprint-Übergänge ab '" + status + "'")
		return m, nil
	}
	m.sprintPick = true
	m.spTargetID = id
	m.spCurStatus = status
	m.spmenu = listState{}
	m.spopts = opts
	m.spmenu.setLen(len(opts))
	return m, nil
}

// openIssueStatus öffnet das Issue-Status-Menü für ein beliebiges Issue —
// view-übergreifend (Review-Cockpit ODER Columns/Detail, DD2-29). sprintID ist
// der Refresh-Kontext (0 wenn kein Sprint geladen).
func (m model) openIssueStatus(it *api.Issue, sprintID int) (tea.Model, tea.Cmd) {
	if it == nil {
		m.status = "Kein Issue gewählt"
		return m, nil
	}
	opts := allowedManualStatuses(it.Status)
	if len(opts) == 0 {
		m.status = noticeText("Keine manuellen Übergänge ab '" + it.Status + "' (passed/rejected via Review)")
		return m, nil
	}
	m.statusPick = true
	m.stIssueID = it.ID
	m.stIssueStatus = it.Status
	m.stSprintID = sprintID
	m.smenu = listState{}
	m.sopts = opts
	m.smenu.setLen(len(opts))
	return m, nil
}

// openMilestoneStatus öffnet das Meilenstein-Status-Menü (T01).
func (m model) openMilestoneStatus() (tea.Model, tea.Cmd) {
	ms := m.selMilestone()
	if ms == nil {
		return m, nil
	}
	opts := milestoneTransitions[ms.Status]
	if len(opts) == 0 {
		m.status = noticeText("Keine Meilenstein-Übergänge ab '" + ms.Status + "'")
		return m, nil
	}
	m.msPick = true
	m.msTargetID = ms.ID
	m.msmenu = listState{}
	m.msopts = opts
	m.msmenu.setLen(len(opts))
	return m, nil
}

// keyMilestoneStatus steuert das Meilenstein-Status-Menü (T01).
func (m model) keyMilestoneStatus(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.msmenu.move(-1)
		return m, nil
	case "down":
		m.msmenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "S":
		m.msPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.msPick = false
		if m.msmenu.cursor < 0 || m.msmenu.cursor >= len(m.msopts) {
			return m, nil
		}
		target := m.msopts[m.msmenu.cursor]
		// DD2-28: completed mit offenen Sprints → Cascade-Confirm statt 422.
		if target == "completed" {
			if ms := m.selMilestone(); ms != nil {
				open := openSprintCount(ms.Sprints)
				if open > 0 {
					m.mcConfirm = true
					m.mcID = ms.ID
					m.mcName = ms.Name
					m.mcSprints = open
					m.status = ""
					return m, nil
				}
			}
		}
		m.status = "Meilenstein → " + target + " …"
		return m, doMilestoneStatus(m.client, m.msTargetID, target)
	}
	return m, nil
}

// openSprintCount zählt nicht-terminale Sprints (DD2-28 Cascade-Confirm).
func openSprintCount(sprints []api.Sprint) int {
	n := 0
	for _, s := range sprints {
		switch s.Status {
		case "completed", "closed", "cancelled":
		default:
			n++
		}
	}
	return n
}

// keyMilestoneCascade behandelt den Cascade-Complete-Confirm (DD2-28).
func (m model) keyMilestoneCascade(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y", "enter":
		m.mcConfirm = false
		m.status = "Meilenstein wird kaskadierend abgeschlossen …"
		return m, doMilestoneCascadeComplete(m.client, m.mcID)
	case "n", "N", "esc", "q":
		m.mcConfirm = false
		m.status = noticeText("Abgebrochen")
		return m, nil
	}
	return m, nil
}

// --- Filter-Modal ---

func (m model) openFilter() (tea.Model, tea.Cmd) {
	m.ftarget = m.depth
	m.fopts = m.filterOptsFor(m.depth)
	m.fcur = listState{}
	m.fcur.setLen(len(m.fopts))
	m.filtering = true
	return m, nil
}

// filterOptsFor sammelt die Werte der Fokus-Spalte (Status + ggf. Deferred-Pseudo).
func (m *model) filterOptsFor(depth int) []filterOpt {
	seen := map[string]bool{}
	var opts []filterOpt
	add := func(val, label string) {
		if val == "" || seen[val] {
			return
		}
		seen[val] = true
		opts = append(opts, filterOpt{val, label})
	}
	switch depth {
	case 0:
		for _, ms := range m.milestones {
			add(ms.Status, ms.Status)
		}
		opts = append(opts, filterOpt{deferredKey, "zurückgestellte zeigen"})
	case 1:
		if ms := m.selMilestone(); ms != nil {
			for _, s := range ms.Sprints {
				add(s.Status, s.Status)
			}
		}
	default:
		for _, it := range m.issuesOfSel() {
			add(it.Status, it.Status)
		}
	}
	return opts
}

func (m *model) filterFor(depth int) *filterState {
	switch depth {
	case 0:
		return &m.fMile
	case 1:
		return &m.fSprint
	default:
		return &m.fIssue
	}
}

func (m model) keyFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.fcur.move(-1)
		return m, nil
	case "down":
		m.fcur.move(1)
		return m, nil
	}
	switch msg.String() {
	case "q", "esc", "f":
		m.filtering = false
		return m, m.afterFilter()
	case " ", "x":
		if m.fcur.cursor < len(m.fopts) {
			m.filterFor(m.ftarget).toggle(m.fopts[m.fcur.cursor].value)
		}
		return m, nil
	case "enter":
		m.filtering = false
		return m, m.afterFilter()
	}
	return m, nil
}

// afterFilter klemmt Cursor + Längen nach Filter-Änderung neu.
func (m *model) afterFilter() tea.Cmd {
	m.mlist.setLen(len(m.visMilestonesRaw()))
	m.slist.setLen(len(m.visSprints()))
	m.ilist.setLen(len(m.visIssues()))
	return m.syncSprint()
}

// --- Yank: Kontext (Meilenstein→Sprints / Sprint→Issues) in Clipboard ---

func (m model) yankContext() (tea.Model, tea.Cmd) {
	switch m.depth {
	case 0:
		if ms := m.selMilestone(); ms != nil {
			if err := clip.Copy(milestoneClip(ms)); err != nil {
				m.errNote = "Clipboard-Fehler: " + err.Error()
			} else {
				m.errNote = ""
				m.status = "Meilenstein-Kontext kopiert (" + ms.Name + ")"
			}
		}
	case 1:
		if s := m.selSprint(); s != nil {
			src := s
			if m.curSprint != nil && m.curSprint.ID == s.ID {
				src = m.curSprint
			}
			if err := clip.Copy(sprintClip(src)); err != nil {
				m.errNote = "Clipboard-Fehler: " + err.Error()
			} else {
				m.errNote = ""
				m.status = "Sprint-Kontext kopiert (" + s.Key + ")"
			}
		}
	default:
		m.status = "Yank: auf Meilenstein (Sprints) oder Sprint (Issues) — h zurück"
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

// keyReview behandelt das Review-Cockpit: Reject-Eingabe, Status-Menü, Verdikte.
func (m model) keyReview(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.usOpen {
		return m.keyUserStory(msg)
	}
	if m.inputting {
		return m.keyReviewInput(msg)
	}
	if m.statusPick {
		return m.keyStatusPick(msg)
	}
	if m.sprintPick {
		return m.keySprintPick(msg)
	}

	switch navKey(msg.String()) {
	case "up":
		m.rlist.move(-1)
		return m, nil
	case "down":
		m.rlist.move(1)
		return m, nil
	}

	it := m.reviewItem()
	switch msg.String() {
	case "q", "esc":
		m.status = ""
		// B01: Columns nach Review immer neu laden — Verdikte/Status-Mutationen
		// im Cockpit ändern m.curSprint, aber m.milestones (Columns) blieb stale.
		if m.reviewReturn == viewReviewsList {
			m.view = viewReviewsList
			return m, tea.Batch(loadReviewSprints(m.client), loadMilestones(m.client))
		}
		m.view = viewColumns
		return m, loadMilestones(m.client)
	case "enter": // Issue-Abnahme-Modal: goal/background/User-Stories abhaken
		if it == nil {
			return m, nil
		}
		m.usOpen = true
		m.usIssueID = it.ID
		m.usList = nil
		m.uslist = listState{}
		m.status = ""
		return m, loadUserStories(m.client, it.ID)
	case "r": // I02: Ergebnisfeld setzen (löst das result-Gate ohne Tool-Wechsel)
		if it == nil {
			return m, nil
		}
		m.resultIssueID = it.ID
		m.resultIssueKey = it.Key
		m.resultSprintID = m.curSprint.ID
		return m.openForm("result")
	case "s": // Status manuell mutieren — nur lifecycle-gültige Ziele
		sid := 0
		if m.curSprint != nil {
			sid = m.curSprint.ID
		}
		return m.openIssueStatus(it, sid)
	case "a": // Pass — Backend erlaubt Verdikt unabhängig vom Issue-Status
		// (autoSetPassedOnReviewPass setzt to_review/rejected→passed). Edit-Lock
		// (submitted Sprint + entschiedene Runde) kommt als Sapphire-Hinweis zurück.
		if it == nil {
			return m, nil
		}
		m.status = "Pass gesendet …"
		return m, doVerdict(m.client, it.ID, "passed", "", m.curSprint.ID)
	case "x": // Reject — analog, Backend validiert
		if it == nil {
			return m, nil
		}
		m.inputting = true
		m.input = ""
		m.status = "Reject-Kommentar (enter=senden, esc=abbrechen): "
	case "o": // Reopen — Backend verlangt to_review (öffnet frische Runde)
		if it == nil {
			return m, nil
		}
		if it.Status != "to_review" {
			m.status = noticeText("Reopen nur bei to_review — sonst w (Rework) drücken")
			return m, nil
		}
		m.status = "Reopen gesendet …"
		return m, doReopen(m.client, it.ID, m.curSprint.ID)
	case "w": // Rework: Issue über die Lifecycle-Kette nach to_review (entsperrt
		// re-Review bei Edit-Lock / status≠to_review, z.B. passed mit not_passed-Verdikt)
		if it == nil {
			return m, nil
		}
		path := reworkPath(it.Status)
		if len(path) == 0 {
			m.status = noticeText("Issue ist bereits to_review")
			return m, nil
		}
		m.status = "Rework: " + it.Status + " → " + strings.Join(path, " → ") + " …"
		return m, doRework(m.client, it.ID, path, m.curSprint.ID)
	case "S": // Sprint-Status-Menü: zeigt gültige Sprint-Transitions
		if m.curSprint == nil {
			return m, nil
		}
		return m.openSprintStatus(m.curSprint.ID, m.curSprint.Status)
	case "C": // Sprint abschließen — nur wenn review
		if m.curSprint == nil {
			return m, nil
		}
		if m.curSprint.Status != "review" {
			m.status = noticeText("Abschluss nur aus review (Sprint ist: " + m.curSprint.Status + ") — erst S")
			return m, nil
		}
		if !m.confirmComplete {
			m.confirmComplete = true
			m.status = noticeText("Sprint abschließen? Nochmal C zum Bestätigen (PO/DD-186)")
			return m, nil
		}
		m.confirmComplete = false
		m.status = "Sprint wird abgeschlossen …"
		return m, doSprintTo(m.client, m.curSprint.ID, "completed")
	}
	return m, nil
}

func (m model) keyReviewInput(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEnter:
		comment := strings.TrimSpace(m.input)
		m.inputting = false
		m.input = ""
		if comment == "" {
			m.status = noticeText("Reject abgebrochen — Kommentar war leer")
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

func (m model) keyStatusPick(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.smenu.move(-1)
		return m, nil
	case "down":
		m.smenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "s":
		m.statusPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.statusPick = false
		if m.stIssueID == 0 || m.smenu.cursor < 0 || m.smenu.cursor >= len(m.sopts) {
			return m, nil
		}
		target := m.sopts[m.smenu.cursor]
		m.status = "Status → " + target + " …"
		return m, doStatus(m.client, m.stIssueID, target, m.stSprintID)
	}
	return m, nil
}

// reworkPath liefert die Statuskette vom aktuellen Status nach to_review
// (lifecycle-konform). Leer, wenn bereits to_review.
func reworkPath(from string) []string {
	switch from {
	case "to_review":
		return nil
	case "in_progress":
		return []string{"to_review"}
	case "planned":
		return []string{"in_progress", "to_review"}
	case "rejected":
		return []string{"in_progress", "to_review"}
	case "passed", "done":
		return []string{"planned", "in_progress", "to_review"}
	case "refined":
		return []string{"planned", "in_progress", "to_review"}
	case "new":
		return []string{"refined", "planned", "in_progress", "to_review"}
	default:
		return []string{"to_review"}
	}
}

// keySprintPick steuert das Sprint-Status-Menü (Taste S).
func (m model) keySprintPick(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.spmenu.move(-1)
		return m, nil
	case "down":
		m.spmenu.move(1)
		return m, nil
	}
	switch msg.String() {
	case "esc", "q", "S", "s":
		m.sprintPick = false
		m.status = ""
		return m, nil
	case "enter":
		m.sprintPick = false
		if m.spTargetID == 0 || m.spmenu.cursor < 0 || m.spmenu.cursor >= len(m.spopts) {
			return m, nil
		}
		target := m.spopts[m.spmenu.cursor]
		m.status = "Sprint → " + target + " …"
		// doSprintTo aktualisiert curSprint (Cockpit); loadMilestones hält die
		// Ranger-Columns frisch (Status im Sprint-Pane), egal von wo getriggert.
		return m, tea.Batch(
			doSprintTo(m.client, m.spTargetID, target), // completed → /complete (gated)
			loadMilestones(m.client),
		)
	}
	return m, nil
}

// keyUserStory steuert das Abnahme-Modal: User-Stories durchgehen + Verdikt setzen.
func (m model) keyUserStory(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.uslist.move(-1)
		return m, nil
	case "down":
		m.uslist.move(1)
		return m, nil
	}
	cur := func() *api.UserStory {
		if m.uslist.cursor >= 0 && m.uslist.cursor < len(m.usList) {
			return &m.usList[m.uslist.cursor]
		}
		return nil
	}
	switch msg.String() {
	case "esc", "q", "enter":
		m.usOpen = false
		m.status = ""
		return m, nil
	case "a": // accepted
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "accepted", m.usIssueID)
		}
	case "r": // rejected
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "rejected", m.usIssueID)
		}
	case "o": // open (zurücksetzen)
		if us := cur(); us != nil {
			return m, doUSVerdict(m.client, us.ID, "open", m.usIssueID)
		}
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
		m.slist.setLen(len(m.visSprints()))
		return m.syncSprint()
	case 1:
		m.ilist.reset()
		return m.syncSprint()
	}
	return nil
}

// keyScroll behandelt Scroll-Tasten in den statischen Detail-Views (DD2-25/30):
// j/k/↑↓ zeilenweise, ctrl+d/u + pgdn/pgup seitenweise, g/G an den Anfang/Ende.
// ok=true wenn die Taste als Scroll konsumiert wurde. scrollView klemmt das Maximum.
func (m *model) keyScroll(k string) bool {
	switch k {
	case "up", "k":
		m.scroll--
	case "down", "j":
		m.scroll++
	case "ctrl+d", "pgdown":
		m.scroll += 10
	case "ctrl+u", "pgup":
		m.scroll -= 10
	case "g", "home":
		m.scroll = 0
	case "G", "end":
		m.scroll = 1 << 20 // wird in scrollView auf max geklemmt
	default:
		return false
	}
	if m.scroll < 0 {
		m.scroll = 0
	}
	return true
}

func (m model) keyBacklog(k string) (tea.Model, tea.Cmd) {
	switch navKey(k) {
	case "up":
		m.blist.move(-1)
	case "down":
		m.blist.move(1)
	}
	if k == "b" || k == "esc" {
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
	}
	return m, nil
}
