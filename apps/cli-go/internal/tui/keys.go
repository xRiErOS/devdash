package tui

import (
	"devd-cli/internal/api"
	"strings"

	keybind "github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
)

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Beenden-Confirm (DD2-49) ist top-most: solange er offen ist, fängt er alles.
	if m.confirmQuit {
		return m.keyConfirmQuit(msg)
	}
	// In-App-Hilfe (DD2-31): jede Taste schließt das offene Overlay wieder.
	if m.helpOpen {
		m.helpOpen = false
		return m, nil
	}
	// Command-Center (T16) ist das globalste Modal — fängt vor allem anderen.
	if m.paletteOpen {
		return m.keyPalette(msg)
	}
	// Projekt-Picker-Overlay (DD2-124): schwebt über jeder View, fängt voll.
	if m.projPick {
		return m.keyProjPick(msg)
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
	// Tag-Zuweisungs-Picker (DD2-33) fängt als Overlay vor den View-Tasten.
	if m.tagPick {
		return m.keyTagPicker(msg)
	}
	// Create-Confirm (DD2-93) fängt vor View-Tasten.
	if m.createConfirm {
		return m.keyCreateConfirm(msg)
	}
	// Cascade-Delete-Confirm (T02b) fängt vor View-Tasten.
	if m.delConfirm {
		return m.keyDelete(msg)
	}
	if m.asPick { // DD2-136: Issue→Sprint-Picker (view-übergreifend, wie delConfirm)
		return m.keyAssignSprint(msg)
	}
	// Meilenstein-Cascade-Complete-Confirm (DD2-28).
	if m.mcConfirm {
		return m.keyMilestoneCascade(msg)
	}
	// Filter-Modal fängt zuerst.
	if m.filtering {
		return m.keyFilter(msg)
	}
	// Tree-Filter-Menü (DD2-62) fängt vor den View-Tasten.
	if m.treeFilterOpen {
		return m.keyTreeFilter(msg)
	}
	// In-App-Hilfe (DD2-31): ? öffnet die Shortcut-Übersicht — view-übergreifend,
	// aber nicht während einer Texteingabe (Tree-/Memory-Suche, Reject-Kommentar),
	// wo ? als Zeichen getippt werden muss.
	if bindHas(keys.Help, msg.String()) && !m.treeSearching && !m.memSearching && !m.inputting {
		m.helpOpen = true
		return m, nil
	}
	// Review-Cockpit hat eigenen Eingabemodus.
	if m.view == viewReviewSprint {
		return m.keyReview(msg)
	}
	// Memory-Browser fängt voll (Suche tippt q/R/p als Text).
	if m.view == viewManageMemory {
		return m.keyMemory(msg)
	}
	// SSTD-Browser (DD2-166) fängt voll (i/k Nav, enter editiert, esc/q zurück).
	if m.view == viewSSTD {
		return m.keySSTD(msg)
	}
	// User-Notes-Browser (DD2-168) fängt voll (/ tippt Suche, n/d/enter, esc/q zurück).
	if m.view == viewUserNotes {
		return m.keyUserNotes(msg)
	}
	// ToDos-Browser (DD2-171) fängt voll (/ tippt Suche, s/o/enter/e/n/d, esc/q zurück).
	if m.view == viewToDos {
		return m.keyToDos(msg)
	}
	// Dokumente-Browser (DD2-167) fängt voll (/ tippt Suche, enter/n/d, esc/q zurück).
	if m.view == viewDocs {
		return m.keyDocs(msg)
	}
	// Tag-Manager (DD2-75) fängt voll (n/e/d + esc/q zurück).
	if m.view == viewManageTags {
		return m.keyTags(msg)
	}
	// Tree+Detail-Prototyp (DD2-57) fängt voll (eigene Nav + t/esc zurück).
	if m.view == viewBrowseProject {
		return m.keyTree(msg)
	}
	// Such-Ansicht (DD2-91) fängt voll (tippen filtert, esc zurück).
	if m.view == viewCommandCenter {
		return m.keySearch(msg)
	}
	// Tutorial (DD2-122) fängt voll (blättern, esc zurück).
	if m.view == viewTutorial {
		return m.keyTutorial(msg)
	}
	// Lobby (DD2-124): alle Keys an den Home-Handler (Nav/Auswahl/Filter).
	if m.view == viewHome {
		return m.keyHome(msg)
	}
	// Backlog mit aktivem Eingabe-/Menü-Overlay (DD2-46): alle Tasten direkt an den
	// Backlog-Handler, bevor die globalen Shortcuts (p/q/R/T) sie abfangen.
	if m.view == viewBrowseBacklog && (m.blSearching || m.blFilterOpen || m.blSortOpen) {
		return m.keyBacklog(msg)
	}
	k := msg.String()
	// Globale Tasten (DD2-174: key.Matches; q=Lobby ist Sonderfall vor keys.Quit)
	switch {
	case k == "q" && m.view == viewNavigateReviews: // DD2-220: q kehrt aus der Reviews-Liste zur Quell-View (Tree) zurück, nicht zur Lobby
		m.view = m.topReturn
		return m, nil
	case k == "q": // DD2-124: q verlässt jede Projekt-View zur Lobby (immer Home)
		return m.goHome()
	case keybind.Matches(msg, keys.Quit): // ctrl+c (q oben) — harter Beenden-Pfad → Confirm (DD2-49)
		return m.requestQuit()
	case keybind.Matches(msg, keys.Picker):
		if m.global != nil {
			return m.openProjPick() // DD2-124: Picker als Overlay (kein View-Wechsel)
		}
	case keybind.Matches(msg, keys.Reviews): // T17: R öffnet von überall die Liste offener Review-Sprints
		return m.openReviewsList()
	case keybind.Matches(msg, keys.Tags): // DD2-75: Tag-Manager von überall
		return m.openTagManager()
	}

	switch m.view {
	case viewDetailIssue:
		if m.keyScroll(k) { // DD2-30: scrollbarer Detail-Body
			return m, nil
		}
		switch {
		case keybind.Matches(msg, keys.Back):
			m.view = viewBrowseProject // DD2-111: Ranger gesunset → Tree-Primat
		case keybind.Matches(msg, keys.Status): // DD2-29: Issue-Status auch im Detail mutieren
			if it := m.selIssue(); it != nil {
				sid := 0
				if m.curSprint != nil {
					sid = m.curSprint.ID
				}
				return m.openIssueStatus(it, sid)
			}
		case keybind.Matches(msg, keys.TagAssign): // DD2-33: Tag-Picker für das Issue
			if it := m.selIssue(); it != nil {
				return m.openTagPicker("issue", it.ID, it.Key+" "+it.Title, it.Tags)
			}
		}
		return m, nil
	case viewDetailMilestone:
		if m.keyScroll(k) {
			return m, nil
		}
		switch {
		case keybind.Matches(msg, keys.Back):
			m.view = viewBrowseProject // DD2-111: Ranger gesunset → Tree-Primat
		case keybind.Matches(msg, keys.Status): // DD2-174: s (war S) — Meilenstein-Status
			return m.openMilestoneStatus()
		case keybind.Matches(msg, keys.Assign): // T03 Flow B: Sprints diesem Meilenstein zuweisen (Checkliste)
			return m.openMilestoneAssign()
		case keybind.Matches(msg, keys.Delete): // T02b: Meilenstein kaskadierend löschen
			if ms := m.selMilestone(); ms != nil {
				return m.openDelete("milestone", ms.ID, ms.Name)
			}
		case keybind.Matches(msg, keys.TagAssign): // DD2-33: Tag-Picker für den Meilenstein
			if ms := m.selMilestone(); ms != nil {
				return m.openTagPicker("milestone", ms.ID, ms.Name, nil)
			}
		}
		return m, nil
	case viewDetailSprint:
		if m.keyScroll(k) {
			return m, nil
		}
		switch {
		case keybind.Matches(msg, keys.Back):
			m.view = viewBrowseProject // DD2-111: Ranger gesunset → Tree-Primat
		case keybind.Matches(msg, keys.Yank):
			return m.yankContext()
		case keybind.Matches(msg, keys.Assign): // DD2-174: a (war m) — diesen Sprint einem Meilenstein zuweisen
			if s := m.selSprint(); s != nil {
				return m.openSprintMilestone(s.ID)
			}
		case keybind.Matches(msg, keys.Delete): // T02b: Sprint kaskadierend löschen
			if s := m.selSprint(); s != nil {
				return m.openDelete("sprint", s.ID, s.Name)
			}
		case keybind.Matches(msg, keys.TagAssign): // DD2-33: Tag-Picker für den Sprint
			if s := m.selSprint(); s != nil {
				return m.openTagPicker("sprint", s.ID, s.Name, nil)
			}
		}
		return m, nil
	case viewNavigateReviews:
		return m.keyReviewsList(msg)
	case viewBrowseBacklog:
		return m.keyBacklog(msg)
	}
	return m, nil
}

// openReviewsList öffnet die Liste offener Review-Sprints (T17). Merkt die
// Quell-View (Tree/Columns), damit q/esc dorthin zurückkehrt (DD2-61 Primat).
func (m model) openReviewsList() (tea.Model, tea.Cmd) {
	if m.view == viewBrowseProject {
		m.topReturn = m.view
	}
	m.view = viewNavigateReviews
	m.rvlist = listState{}
	m.status = ""
	return m, loadReviewSprints(m.client)
}

// openBacklog öffnet die Backlog-Liste und merkt die Quell-View (Tree/Columns)
// für die Rückkehr (DD2-61 Primat) — geteilt von keyTree und Backlog-Einstiegen.
func (m model) openBacklog() (tea.Model, tea.Cmd) {
	if m.view == viewBrowseProject {
		m.topReturn = m.view
	}
	m.view = viewBrowseBacklog
	m.detailFocus = false         // DD2-32: Einstieg immer im Listen-Fokus
	m.secCursor, m.accOpen = 0, 1 // Detail-Preview: erste Content-Section offen
	m.detailLevel, m.fieldCursor = 0, 0
	return m, loadBacklog(m.client)
}

// keyReviewsList steuert die Review-Sprint-Liste: Auswahl öffnet das Cockpit.
func (m model) keyReviewsList(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch navKey(msg.String()) {
	case "up":
		m.rvlist.move(-1)
		return m, nil
	case "down":
		m.rvlist.move(1)
		return m, nil
	}
	switch { // DD2-174
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Reviews): // esc/R schließt
		m.view = m.topReturn // zurück zur Quell-View (Tree/Columns, DD2-61)
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		if m.rvlist.cursor >= 0 && m.rvlist.cursor < len(m.reviewSprints) {
			s := m.reviewSprints[m.rvlist.cursor]
			m.view = viewReviewSprint
			m.reviewReturn = viewNavigateReviews // q/esc kehrt zur Liste zurück
			m.rlist.reset()
			m.confirmComplete = false
			m.curSprint = nil
			return m, loadSprint(m.client, s.ID)
		}
	}
	return m, nil
}

// filteredProjects filtert m.projects nach dem aktuellen projectQuery (Name/Prefix/Slug).
func (m model) filteredProjects() []api.Project {
	q := strings.ToLower(strings.TrimSpace(m.projectQuery))
	if q == "" {
		return m.projects
	}
	var out []api.Project
	for _, p := range m.projects {
		if strings.Contains(strings.ToLower(p.Name), q) ||
			strings.Contains(strings.ToLower(p.Prefix), q) ||
			strings.Contains(strings.ToLower(p.Slug), q) {
			out = append(out, p)
		}
	}
	return out
}

// openSprintStatus öffnet das Sprint-Status-Menü für einen Ziel-Sprint
// (Cockpit S oder Tree, T05) — lifecycle-gültige Transitions.
func (m model) openSprintStatus(id int, status string) (tea.Model, tea.Cmd) {
	opts := sprintTransitions[status]
	if len(opts) == 0 {
		m.status = noticeText("No sprint transitions from '" + status + "'")
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
// view-übergreifend (Review-Cockpit ODER Detail/Tree, DD2-29). sprintID ist
// der Refresh-Kontext (0 wenn kein Sprint geladen).
func (m model) openIssueStatus(it *api.Issue, sprintID int) (tea.Model, tea.Cmd) {
	if it == nil {
		m.status = "No issue selected"
		return m, nil
	}
	opts := allowedManualStatuses(it.Status)
	if len(opts) == 0 {
		m.status = noticeText("No manual transitions from '" + it.Status + "' (passed/rejected via Review)")
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

// openMilestoneStatus öffnet das Meilenstein-Status-Menü (T01) für den
// selektierten Meilenstein.
func (m model) openMilestoneStatus() (tea.Model, tea.Cmd) {
	return m.openMilestoneStatusFor(m.selMilestone())
}

// openMilestoneStatusFor öffnet das Menü für einen beliebigen Meilenstein (Tree:
// Knoten unter dem Cursor). Ziel-Daten werden kopiert, damit der Confirm/Render
// nicht auf selMilestone angewiesen ist (view-übergreifend).
func (m model) openMilestoneStatusFor(ms *api.Milestone) (tea.Model, tea.Cmd) {
	if ms == nil {
		return m, nil
	}
	opts := milestoneTransitions[ms.Status]
	if len(opts) == 0 {
		m.status = noticeText("No milestone transitions from '" + ms.Status + "'")
		return m, nil
	}
	m.msPick = true
	m.msTargetID = ms.ID
	m.msTargetName = ms.Name
	m.msTargetStatus = ms.Status
	m.msTargetOpenSprint = openSprintCount(ms.Sprints)
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
	switch { // DD2-174: s (war S) öffnet/schließt das Status-Menü
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Status), msg.String() == "q":
		m.msPick = false
		m.status = ""
		return m, nil
	case keybind.Matches(msg, keys.Enter):
		m.msPick = false
		if m.msmenu.cursor < 0 || m.msmenu.cursor >= len(m.msopts) {
			return m, nil
		}
		target := m.msopts[m.msmenu.cursor]
		// DD2-28: completed mit offenen Sprints → Cascade-Confirm statt 422. Ziel-Daten
		// aus dem beim Öffnen kopierten State (view-übergreifend, auch Tree).
		if target == "completed" && m.msTargetOpenSprint > 0 {
			m.mcConfirm = true
			m.mcID = m.msTargetID
			m.mcName = m.msTargetName
			m.mcSprints = m.msTargetOpenSprint
			m.status = ""
			return m, nil
		}
		m.status = "Milestone → " + target + " …"
		return m, doMilestoneStatus(m.client, m.msTargetID, target)
	}
	return m, nil
}

// openSprintCount zählt nicht-terminale Sprints (DD2-28 Cascade-Confirm).
func openSprintCount(sprints []api.Sprint) int {
	n := 0
	for _, s := range sprints {
		switch s.Status {
		case "completed", "cancelled":
		default:
			n++
		}
	}
	return n
}

// keyMilestoneCascade behandelt den Cascade-Complete-Confirm (DD2-28).
func (m model) keyMilestoneCascade(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch { // DD2-174: enter=confirm, esc/n=cancel
	case keybind.Matches(msg, keys.Enter):
		m.mcConfirm = false
		m.status = "Closing milestone cascading …"
		return m, doMilestoneCascadeComplete(m.client, m.mcID)
	case keybind.Matches(msg, keys.Back), msg.String() == "n":
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
		opts = append(opts, filterOpt{deferredKey, "show deferred"})
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
	switch { // DD2-174: key.Matches; X = alle Facetten löschen (FilterClear)
	case keybind.Matches(msg, keys.Back), keybind.Matches(msg, keys.Filter), msg.String() == "q":
		m.filtering = false
		return m, m.afterFilter()
	case keybind.Matches(msg, keys.FilterClear): // X — alle Facetten dieser Spalte zeigen
		m.filterFor(m.ftarget).clear()
		return m, nil
	case keybind.Matches(msg, keys.Toggle):
		if m.fcur.cursor < len(m.fopts) {
			m.filterFor(m.ftarget).toggle(m.fopts[m.fcur.cursor].value)
		}
		return m, nil
	case keybind.Matches(msg, keys.Enter):
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
