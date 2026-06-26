package tui

import (
	"fmt"
	"strings"

	"devd-cli/internal/api"
	"devd-cli/internal/clip"
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
	viewMilestone
	viewSprint
)

// filterState hält pro Spalte, welche Werte ausgeblendet sind.
type filterState struct {
	hidden map[string]bool
}

func (f filterState) shown(val string) bool { return !f.hidden[val] }
func (f *filterState) toggle(val string)     { f.hidden[val] = !f.hidden[val] }

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
	statusPick      bool   // s: Issue-Status-Menü aktiv
	smenu           listState
	sopts           []string

	// User-Story-Abnahme-Modal (T14): enter im Review öffnet goal/background/US.
	usOpen    bool
	usList    []api.UserStory
	uslist    listState
	usIssueID int
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
	m.fMile = filterState{hidden: map[string]bool{"completed": true, "cancelled": true, deferredKey: true}}
	m.fSprint = filterState{hidden: map[string]bool{"completed": true, "cancelled": true}}
	m.fIssue = filterState{hidden: map[string]bool{"cancelled": true}}
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

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Filter-Modal fängt zuerst.
	if m.filtering {
		return m.keyFilter(msg)
	}
	// Review-Cockpit hat eigenen Eingabemodus.
	if m.view == viewReview {
		return m.keyReview(msg)
	}
	k := msg.String()
	// Globale Tasten
	switch k {
	case "ctrl+c", "q":
		if m.view == viewDetail || m.view == viewBacklog || m.view == viewMilestone || m.view == viewSprint {
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
	case viewMilestone:
		if k == "esc" {
			m.view = viewColumns
		}
		return m, nil
	case viewSprint:
		switch k {
		case "esc":
			m.view = viewColumns
		case "y":
			return m.yankContext()
		case "R":
			if s := m.selSprint(); s != nil {
				m.view = viewReview
				m.rlist.reset()
				m.confirmComplete = false
				return m, m.syncSprint()
			}
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
		if m.depth == 0 && m.selMilestone() != nil {
			m.view = viewMilestone
		} else if m.depth == 1 && m.selSprint() != nil {
			m.view = viewSprint
			return m, m.syncSprint()
		} else if m.depth == 2 && m.selIssue() != nil {
			m.view = viewDetail
		}
	case "f":
		return m.openFilter()
	case "y":
		return m.yankContext()
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
				m.status = "Clipboard-Fehler: " + err.Error()
			} else {
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
				m.status = "Clipboard-Fehler: " + err.Error()
			} else {
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
		m.view = viewColumns
		m.status = ""
		return m, nil
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
	case "s": // Status manuell mutieren — nur lifecycle-gültige Ziele
		if it == nil {
			m.status = "Kein Issue gewählt"
			return m, nil
		}
		opts := allowedManualStatuses(it.Status)
		if len(opts) == 0 {
			m.status = noticeText("Keine manuellen Übergänge ab '" + it.Status + "' (passed/rejected via a/x)")
			return m, nil
		}
		m.statusPick = true
		m.smenu = listState{}
		m.sopts = opts
		m.smenu.setLen(len(m.sopts))
		return m, nil
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
	case "S": // Sprint-Status toggeln: active→review (Review starten) / review→active (Runde beenden)
		if m.curSprint == nil {
			return m, nil
		}
		switch m.curSprint.Status {
		case "active":
			m.status = "Sprint → review (Review-Runde starten) …"
			return m, doSprintTo(m.client, m.curSprint.ID, "review")
		case "review":
			m.status = "Sprint → active (Review-Runde beenden) …"
			return m, doSprintTo(m.client, m.curSprint.ID, "active")
		default:
			m.status = noticeText("S nur aus active/review (Sprint ist: " + m.curSprint.Status + ")")
			return m, nil
		}
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
		it := m.reviewItem()
		if it == nil || m.curSprint == nil || m.smenu.cursor >= len(m.sopts) {
			return m, nil
		}
		target := m.sopts[m.smenu.cursor]
		m.status = "Status → " + target + " …"
		return m, doStatus(m.client, it.ID, target, m.curSprint.ID)
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
